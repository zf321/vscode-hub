const path = require('path')
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
/* const CleanWebpackPlugin = require('clean-webpack-plugin') */
const CopyWebpackPlugin = require('copy-webpack-plugin')
const ExtractTextPlugin = require('extract-text-webpack-plugin')
module.exports = {
  context: path.resolve(__dirname, '../'),
  entry: {
    vscodehub: './index.js'
  },
  plugins: [
    new CleanWebpackPlugin(),
    
    new ExtractTextPlugin('[name].css')
  ],
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, './dist')
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: [
            {
              loader: 'css-loader'
            }
          ]
        })
      }
    ]
  }
}
