const path = require('path')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')

module.exports = {
  webpack: {
    configure: {
      output: {
        filename: 'static/js/main.js',
        chunkFilename: 'static/js/[name].chunk.js',
        assetModuleFilename: 'static/media/[name][ext]',
      }
    },
    plugins: {
      remove: [
        'MiniCssExtractPlugin'
      ],
      add: [
        new MiniCssExtractPlugin({
          filename: 'static/css/[name].css',
          chunkFilename: 'static/css/[name].chunk.css',
        }),
      ]
    }
  },
}