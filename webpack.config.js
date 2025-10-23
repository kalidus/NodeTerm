const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');
const packageJson = require('./package.json');

module.exports = {
  mode: 'development',
  entry: './src/index.js',
  target: 'electron-renderer',
  node: {
    __dirname: false,
    __filename: false
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react']
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: 'asset/resource'
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html'
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'preload.js', to: 'preload.js' },
        { from: 'node_modules/kdbxweb/dist/kdbxweb.min.js', to: 'vendor/kdbxweb.min.js' }
      ]
    }),
    new webpack.DefinePlugin({
      'process.env.REACT_APP_VERSION': JSON.stringify(packageJson.version),
      'process.env.REACT_APP_NAME': JSON.stringify(packageJson.name),
      'process.env.REACT_APP_BUILD_DATE': JSON.stringify(new Date().toLocaleDateString()),
      'global': 'window.global',
      'globalThis': 'window'
    }),
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
      global: 'globalThis'
    })
  ],
  resolve: {
    extensions: ['.js', '.jsx'],
    fallback: {
      "process": require.resolve("process/browser"),
      "buffer": require.resolve("buffer"),
      "path": require.resolve("path-browserify"),
      "os": require.resolve("os-browserify/browser"),
      "crypto": require.resolve("crypto-browserify"),
      "stream": require.resolve("stream-browserify"),
      "util": require.resolve("util"),
      "url": require.resolve("url"),
      "querystring": require.resolve("querystring-es3"),
      "assert": require.resolve("assert"),
      "fs": false,
      "net": false,
      "tls": false,
      "vm": false,
      "child_process": false,
      "module": false,
      "perf_hooks": false,
      "vfile": false,
      "unified": false,
      "micromark": false,
      "mdast": false,
      "hast": false,
      "rehype": false,
      "remark": false,
      "estree-util-is": false,
      "estree-util-visit": false,
      "bail": false,
      "extend": false,
      "is-plain-obj": false,
      "trough": false,
      "zwitch": false,
      "vfile-message": false,
      "unist-util-is": false,
      "unist-util-visit": false,
      "unist-util-visit-parents": false,
      "unist-util-position": false,
      "unist-util-generated": false,
      "unist-util-stringify-position": false,
      "unist-util-remove-position": false,
      "unist-util-modify-children": false,
      "unist-util-find-after": false,
      "unist-util-find-before": false,
      "unist-util-find-all-after": false,
      "unist-util-find-all-before": false,
      "unist-util-find-all-between": false,
      "unist-util-find": false,
      "unist-util-is": false,
      "unist-util-remove": false,
      "unist-util-select": false,
      "unist-util-select-all": false,
      "unist-util-select-all-between": false,
      "unist-util-select-all-after": false,
      "unist-util-select-all-before": false,
      "unist-util-select-in": false,
      "unist-util-select-out": false,
      "unist-util-select-matches": false,
      "unist-util-select-matches-all": false,
      "unist-util-select-matches-all-between": false,
      "unist-util-select-matches-all-after": false,
      "unist-util-select-matches-all-before": false,
      "unist-util-select-matches-in": false,
      "unist-util-select-matches-out": false,
      "unist-util-select-matches-all-in": false,
      "unist-util-select-matches-all-out": false,
      "unist-util-select-matches-all-between-in": false,
      "unist-util-select-matches-all-between-out": false,
      "unist-util-select-matches-all-after-in": false,
      "unist-util-select-matches-all-after-out": false,
      "unist-util-select-matches-all-before-in": false,
      "unist-util-select-matches-all-before-out": false,
      "unist-util-select-matches-all-between-in": false,
      "unist-util-select-matches-all-between-out": false,
      "unist-util-select-matches-all-after-in": false,
      "unist-util-select-matches-all-after-out": false,
      "unist-util-select-matches-all-before-in": false,
      "unist-util-select-matches-all-before-out": false
    }
  },

  externals: {
    'utf-8-validate': 'commonjs utf-8-validate',
    'bufferutil': 'commonjs bufferutil'
  },
  devtool: 'source-map'
}; 