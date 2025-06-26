const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');
const packageJson = require('./package.json');

module.exports = {
  mode: 'development',
  entry: './src/index.js',
  target: 'electron-renderer',
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
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html'
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'preload.js', to: 'preload.js' }
      ]
    }),
    new webpack.DefinePlugin({
      'process.env.REACT_APP_VERSION': JSON.stringify(packageJson.version),
      'process.env.REACT_APP_NAME': JSON.stringify(packageJson.name),
      'process.env.REACT_APP_BUILD_DATE': JSON.stringify(new Date().toLocaleDateString())
    })
  ],
  resolve: {
    extensions: ['.js', '.jsx']
  },
  devtool: 'source-map'
}; 