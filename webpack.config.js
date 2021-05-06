const path = require("path");
const webpack = require('webpack');
const CopyWebpackPlugin = require("copy-webpack-plugin");
const MinifyBundledWebpackPlugin = require('minify-bundled-webpack-plugin');
const HtmlMinimizerPlugin = require("html-minimizer-webpack-plugin");
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = {
    mode: "production",
    entry: {
        "background": './src/background.js',
        "js/migration": './src/js/migration.js',
        "js/options": './src/js/options.js',
        "js/postHandler": './src/js/postHandler.js'
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: "[name].js",
        publicPath: "./"
    },
    devtool: 'source-map',
    module: {
        rules: [
            {
                test: /\.css$/i,
                use: ['style-loader', 'css-loader'],
            },
            {
                test: /\.(svg|eot|woff|woff2|ttf)$/,
                use: ['file-loader']
            }
        ]
    },
    plugins: [
        new CleanWebpackPlugin(),

        // Copy all files from src/ to dist/ folder.
        new CopyWebpackPlugin({
            patterns: [path.join(__dirname, 'src/')],
        }),

        // Minify copied files.
        new MinifyBundledWebpackPlugin({
            patterns: ['**/*.+(json|css|js)'],
        })
    ],
    optimization: {
        minimize: true,
        minimizer: [
            new HtmlMinimizerPlugin(),
        ],
    }
}