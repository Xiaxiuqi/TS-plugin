const webpack = require('webpack');
const path = require('path');

const config = {
  mode: 'production',
  entry: './src/角色浮岛/index.ts',
  output: {
    path: path.resolve(__dirname, 'dist/角色浮岛'),
    filename: 'index.js',
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.scss$/,
        use: ['style-loader', 'css-loader', 'sass-loader']
      },
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.js', '.scss']
  }
};

webpack(config, (err, stats) => {
  if (err || stats.hasErrors()) {
    console.error('Build failed:', err || stats.toJson().errors);
  } else {
    console.log('Build successful!');
  }
});
