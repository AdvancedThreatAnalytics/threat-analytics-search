const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const HtmlMinimizerPlugin = require("html-minimizer-webpack-plugin");

module.exports = {
  mode: "production",
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
        test: /\.(svg|eot|woff|woff2|ttf)$/,
        use: ["file-loader"],
      },
    ],
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        {
          // Copy assets from 'src/' and settings file to 'dist/' folder.
          from: path.join(__dirname, "src/"),
          globOptions: {
            ignore: ["**/*.+(css|js)"],
          },
        },
        {
          from: "./settings.json",
        },
      ],
    }),
  ],
  optimization: {
    minimize: true,
    minimizer: [new HtmlMinimizerPlugin()]
  },
};
