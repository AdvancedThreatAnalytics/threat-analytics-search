import _ from "lodash";
import Mustache from "mustache";
import Notiflix from "notiflix";
import { Sortable } from "sortablejs";

import LocalStore from "./local_store";

function providerTabHelper(
  initData,
  storageKey,
  settings,
  configForm,
  configDivId,
  configTemplateId,
  queriesForm,
  queriesDivId,
  queriesTemplateId,
  afterSave,
  autofillerParser
) {
  var tab = {
    initialize: function() {
      return Promise.all([
        tab.initializeConfig(),
        tab.initializeQueries(),
      ]);
    },

    updateForms: function() {
      return tab.initialize();
    },

    // --- Configuration --- //

    initializeConfig: async function() {
      var provData = await LocalStore.getOne(storageKey) || {};

      // Update HTML.
      var template = document.getElementById(configTemplateId).innerHTML;
      var rendered = Mustache.render(template, {
        items: _.map(settings, function(item) {
          var value = _.get(provData.config, item.key);
          return _.assignIn({
            isCheckbox: item.type === "checkbox",
            value: value || '',
            checked: (value === true || value === "true")? "checked" : "",
            placeholder: item.placeholder || '',
          }, item);
        }),
      });
      document.getElementById(configDivId).innerHTML = rendered;

      // Add click behavior to undo button.
      document.querySelector(`form[name="${configForm}"] button[type="reset"]`).addEventListener("click", tab.undoConfigChanges);

      // Add click/change listeners to inputs.
      _.forEach(settings, function(item) {
        var elem = document.querySelector(`form[name="${configForm}"] input[name="${item.key}"]`);
        if(item.autofiller) {
          elem.addEventListener("change", tab.onConfigAutofillerChanged);
        } else if(item.type === "checkbox"){
          elem.addEventListener("click", tab.onConfigInputChanged);
        } else {
          elem.addEventListener("change", tab.onConfigInputChanged);
        }
      });
    },

    undoConfigChanges: function(event) {
      event.preventDefault();
      return tab._undoChanges('config', 'configuration', tab.initializeConfig);
    },

    onConfigAutofillerChanged: async function(event) {
      // Parse input value.
      var newValue = _.get(event, 'target.value');
      var parsedValues = autofillerParser(newValue);
      if(!_.isEmpty(parsedValues)) {
        // Add also autofiller value.
        parsedValues.push({
          key: _.get(event, 'target.name'),
          value: newValue
        });

        // Save values.
        await tab._updateLocalStoreData('config', parsedValues);

        // Reset form.
        await tab.initializeConfig();
      }
    },

    onConfigInputChanged: async function(event) {
      var targetName = _.get(event, 'target.name');
      if(!_.isEmpty(targetName)) {
        // Save new value.
        await tab._updateLocalStoreData('config', [{
          key: targetName,
          value: event.target.type === 'checkbox'
            ? event.target.checked
            : event.target.value
        }]);
      }
    },

    // --- Queries --- //

    initializeQueries: async function() {
      var provData = await LocalStore.getOne(storageKey) || {};

      // Update HTML.
      var template = document.getElementById(queriesTemplateId).innerHTML;
      var rendered = Mustache.render(template, {
        formName: queriesForm,
        items: _.map(provData.queries, function(query, index) {
          return _.assign({}, query, {
            index: index,
            enabled: query.enabled ? "checked" : "",
          });
        }),
      });
      document.getElementById(queriesDivId).innerHTML = rendered;

      // Add click behavior to undo and add buttons.
      document.querySelector(`form[name="${queriesForm}"] button[type="reset"]`).addEventListener("click", tab.undoQueriesChanges);
      document.querySelector(`form[name="${queriesForm}"] button[name="add_new"]`).addEventListener("click", tab.addQuery);

      // Make list sortable.
      Sortable.create(document.querySelector(
        `form[name="${queriesForm}"] ul.list-group`),
        { handle: ".sortable-handle", onEnd: tab.onQueryDragged }
      );

      // Add click listeners to delete buttons.
      _.forEach(provData.queries, function(item, index) {
        document.querySelector(`form[name="${queriesForm}"] button[name="delete_${index}"]`).addEventListener("click", tab.removeQuery);
      });

      // Add click/change listeners to inputs (except for the ones from the creation form).
      var inputs = document.querySelectorAll(`form[name="${queriesForm}"] input`);
      _.forEach(inputs, function(input) {
        if(input.name === 'label_new' || input.name === 'query_new') {
          return;
        }

        if(input.type === "checkbox") {
          input.addEventListener("click", tab.onQueryInputChanged);
        } else {
          input.addEventListener("change", tab.onQueryInputChanged);
        }
      });
    },

    undoQueriesChanges: function(event) {
      event.preventDefault();
      return tab._undoChanges('queries', 'queries', tab.initializeQueries);
    },

    onQueryDragged: async function(event) {
      // Move query.
      var queries = _.get(await LocalStore.getOne(storageKey), 'queries', []);
      queries.splice(event.newIndex, 0, queries.splice(event.oldIndex, 1)[0]);
      await tab._updateLocalStoreData('queries', queries, true);

      // NOTE: Updating the form is required because the 'index' is being used as unique ID for each item.
      tab.initializeQueries();
    },

    removeQuery: async function(event) {
      event.preventDefault();

      if(confirm("Are you sure you want to remove this query?")) {
        // Get index.
        var rootElem = event.target.closest('li');
        var index = parseInt(rootElem.getAttribute("data-index"), 10);

        // Remove query.
        var queries = _.get(await LocalStore.getOne(storageKey), 'queries', []);
        queries.splice(index, 1);
        await tab._updateLocalStoreData('queries', queries, true);

        // Update UI according to this change and show success message.
        tab.initializeQueries();
        Notiflix.Notify.Success("Query removed");
      }
    },

    addQuery: async function(event) {
      event.preventDefault();

      // Get form data.
      var formElem = document.querySelector(`form[name="${queriesForm}"]`);
      var formData = new FormData(formElem);

      // Validate values.
      var errMsg;
      if(_.isEmpty(formData.get('label_new')) || _.isEmpty(formData.get('query_new'))) {
        errMsg = "The label and the query are required values";
      }
      if(!_.isNil(errMsg)) {
        Notiflix.Notify.Failure(errMsg);
        return;
      }

      // Add new option.
      var queries = _.get(await LocalStore.getOne(storageKey), 'queries', []);
      queries.push({
        menuIndex: -1,
        label: formData.get('label_new'),
        query: formData.get('query_new'),
        enabled: true,
      });
      await tab._updateLocalStoreData('queries', queries, true);

      // Clear form.
      document.querySelector(`form[name="${queriesForm}"] input[name="label_new"]`).value = "";
      document.querySelector(`form[name="${queriesForm}"] input[name="query_new"]`).value = "";

      // Update UI according to this change and show success message.
      tab.initializeQueries();
      Notiflix.Notify.Success("Query added successfully");
    },

    onQueryInputChanged: async function(event) {
      // Get index.
      var rootElem = event.target.closest('li');
      var index = parseInt(rootElem.getAttribute("data-index"), 10);

      // Get form data.
      var formElem = document.querySelector(`form[name="${queriesForm}"]`);
      var formData = new FormData(formElem);

      // Update query.
      var queries = _.get(await LocalStore.getOne(storageKey), 'queries', []);
      queries[index].label = formData.get("label_" + index);
      queries[index].query = formData.get("query_" + index);
      queries[index].enabled = formData.get("enabled_" + index) === "yes";

      await tab._updateLocalStoreData('queries', queries, true);
    },

    // --- Utilities --- //

    _updateLocalStoreData: async function(field, newValues, override) {
      // Get current data.
      var fullData = await LocalStore.getOne(storageKey) || {};
      var subData = fullData[field] || {};

      // Update values.
      if(override) {
        subData = newValues;
      } else {
        _.forEach(newValues, function(item) {
          subData[item.key] = item.value;
        });
      }

      // Save new values.
      fullData[field] = subData;
      await LocalStore.setOne(storageKey, fullData);

      // Invoke callback.
      afterSave();
    }, 

    _undoChanges: async function(field, name, resetForm) {
      if(confirm(`Are you sure you want to undo all recents changes on ${name}?`)) {
        // Reset data.
        var oldData = initData[storageKey];
        await tab._updateLocalStoreData(field, oldData[field], true);

        // Reset form and show confirmation message.
        resetForm();
        Notiflix.Notify.Success(`Recent changes on ${name} were undo`);
      }
    },
  };

  return tab;
}

export default providerTabHelper;