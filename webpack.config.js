const path = require("path");
const bomPlugin = require("webpack-utf8-bom");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const HtmlReplaceWebpackPlugin = require('html-replace-webpack-plugin');
const Dotenv = require("dotenv-webpack");

module.exports = (env) => ({
  entry: {
    background: "./src/background.js",
    "js/migration": "./src/js/migration.js",
    "js/options": "./src/js/options.js",
    "js/postHandler": "./src/js/postHandler.js",
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
    publicPath: "./",
  },
  devtool: "source-map",
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.scss$/i,
        use: ["style-loader", "css-loader", "sass-loader"],
      },
      {
        test: /\.(svg|eot|woff|woff2|ttf)$/,
        use: ["file-loader"],
      },
      {
        test: /\.svelte$/,
        use: {
          loader: 'svelte-loader',
        },
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./src/options.html",
      filename: "options.html",
      chunks: ["js/options"],
    }),
    new HtmlWebpackPlugin({
      template: "./src/postHandler.html",
      filename: "postHandler.html",
      chunks: ["js/postHandler"],
    }),
    new HtmlWebpackPlugin({
      template: "./src/migration.html",
      filename: "migration.html",
      chunks: ["js/migration"],
    }),
    new HtmlWebpackPlugin({
      template: "./src/views/providers.html",
      filename: "views/providers.html",
    }),
    new HtmlReplaceWebpackPlugin([
      {
        pattern: "@@browserName",
        replacement: env.mode === "edge" ? "Edge" : "Chrome"
      },
    ]),
    new CopyWebpackPlugin({
      patterns: [
        {
          // Copy assets from 'src/' and settings file to 'dist/' folder.
          from: path.join(__dirname, "src/"),
          globOptions: {
            ignore: [
              "**/*.+(css|js|svelte)",
              "**/migration.html",
              "**/options.html",
              "**/postHandler.html",
              "**/providers.html"
            ],
          },
        },
        {
          // Replace update URL depending if we are compiling for Edge or for Chrome.
          from: path.join(__dirname, "src/manifest.json"),
          transform(content) {
            return content
              .toString()
              .replace(
                "process.env.update_url",
                env.mode === "edge"
                  ? "https://edge.microsoft.com/extensionwebstorebase/v1/crx"
                  : "https://clients2.google.com/service/update2/crx"
              )
          }
        },
        {
          from: "./settings.json",
        },
      ],
    }),
    new bomPlugin(true),
    new Dotenv({
      path: `./${env.mode}.env`,
    }),
  ],
  optimization: {
    minimize: true,
    splitChunks: {
      chunks(chunk) {
        // Don't split background file, otherwise won't be loaded completely by Chrome.
        return chunk.name !== "background";
      },
    },
  },
});
