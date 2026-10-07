const path = require('path');
const fs = require('fs');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');
const packageJson = require('./package.json');

function embedChangelogSource() {
  const changelogPath = path.join(__dirname, 'CHANGELOG.md');
  const outPath = path.join(__dirname, 'src', 'data', 'changelogSource.js');
  try {
    const markdown = fs.readFileSync(changelogPath, 'utf8');
    const next = `export default ${JSON.stringify(markdown)};\n`;
    let prev = '';
    try {
      prev = fs.readFileSync(outPath, 'utf8');
    } catch (err) {
      prev = '';
    }
    if (prev !== next) {
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, next);
    }
  } catch (err) {
    console.warn('[webpack] No se pudo embeber CHANGELOG.md:', err.message);
  }
}

embedChangelogSource();

module.exports = {
  mode: 'development',
  // 🚀 Limpiar consola: solo mostrar compilación y avisos/errores, sin volcar la lista de todos los assets
  stats: 'minimal',
  entry: './src/index.js',
  target: 'electron-renderer',
  // Cache en disco. En watch, una sola generación en RAM: el valor por defecto
  // retiene todas y, al serializar el módulo de ~6 MB, el heap no puede crecer.
  cache: {
    type: 'filesystem',
    maxMemoryGenerations: process.argv.includes('--watch') ? 1 : 0,
    buildDependencies: { config: [__filename] }
  },
  node: {
    __dirname: false,
    __filename: false
  },
  output: {
    filename: '[name].bundle.js',
    chunkFilename: '[name].chunk.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
    // electron-renderer no define `global`; sin esto el runtime de chunks falla al cargar
    globalObject: 'globalThis',
  },
  // 🚀 OPTIMIZACIÓN: Code splitting para reducir bundle inicial
  optimization: {
    splitChunks: {
      chunks: 'all',
      maxInitialRequests: 10,
      minSize: 20000,
      cacheGroups: {
        // Vendors de React (críticos, cargar primero)
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
          name: 'react',
          priority: 40,
          chunks: 'all',
        },
        // PrimeReact (pesado pero necesario para UI)
        primereact: {
          test: /[\\/]node_modules[\\/](primereact|primeicons|primeflex)[\\/]/,
          name: 'primereact',
          priority: 30,
          chunks: 'all',
        },
        // xterm (para terminales - chunk aislado dedicado)
        xterm: {
          test: /[\\/]node_modules[\\/](@xterm|xterm)[\\/]/,
          name: 'xterm',
          priority: 25,
          chunks: 'all',
        },
        // Editor de documentos Tiptap / Prosemirror / Lowlight / Highlight.js
        tiptap: {
          test: /[\\/]node_modules[\\/](@tiptap|prosemirror[\w-]*|lowlight|highlight\.js)[\\/]/,
          name: 'tiptap',
          priority: 22,
          chunks: 'all',
        },
        // Visor VNC / noVNC
        novnc: {
          test: /[\\/]node_modules[\\/]@novnc[\\/]/,
          name: 'novnc',
          priority: 20,
          chunks: 'all',
        },
        // Otros vendors
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
          chunks: 'all',
          reuseExistingChunk: true,
        },
      },
    },
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
        test: /\.m?js$/,
        resolve: {
          fullySpecified: false
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: 'asset/resource'
      },
      {
        test: /\.(woff|woff2|ttf|eot)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'assets/fonts/[name][ext]'
        }
      },
      {
        test: /CHANGELOG\.md$/,
        type: 'asset/source'
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
        { from: 'node_modules/kdbxweb/dist/kdbxweb.min.js', to: 'vendor/kdbxweb.min.js' },
        { from: 'testing/splash-preview.html', to: 'splash-preview.html', noErrorOnMissing: true },
        {
          from: 'src/assets/fonts',
          to: 'assets/fonts',
          noErrorOnMissing: true,
          globOptions: {
            ignore: ['**/.gitkeep']
          }
        }
      ]
    }),
    new webpack.DefinePlugin({
      'process.env.REACT_APP_VERSION': JSON.stringify(packageJson.version),
      'process.env.REACT_APP_NAME': JSON.stringify(packageJson.name),
      'process.env.REACT_APP_BUILD_DATE': JSON.stringify(new Date().toLocaleDateString()),
      'global': 'globalThis',
      'globalThis': 'globalThis'
    }),
    new webpack.ProvidePlugin({
      process: 'process/browser.js',
      Buffer: ['buffer', 'Buffer'],
      global: 'globalThis'
    }),
    {
      apply(compiler) {
        compiler.hooks.done.tap('WebpackReadyPlugin', () => {
          try {
            const dir = compiler.options.output.path;
            fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(path.join(dir, '.webpack-ready'), String(Date.now()));
          } catch (_) { /* el siguiente ciclo lo reintenta */ }
        });
      }
    }
  ],
  resolve: {
    extensions: ['.js', '.jsx'],
    fallback: {
      "process": require.resolve("process/browser.js"),
      "buffer": require.resolve("buffer"),
      "path": require.resolve("path-browserify"),
      "os": false,
      "crypto": false,
      "stream": false,
      "util": false,
      "url": false,
      "querystring": false,
      "assert": false,
      "http": false,
      "https": false,
      "zlib": false,
      "fs": false,
      "net": false,
      "tls": false,
      "vm": false,
      "child_process": false,
      "module": false,
      "perf_hooks": false
    }
  },

  externals: {
    'utf-8-validate': 'commonjs utf-8-validate',
    'bufferutil': 'commonjs bufferutil'
  },
  // Desactivar source maps en producción. En dev: eval-cheap-module evita .map en disco → menos I/O en la 1.ª carga
  devtool: process.env.NODE_ENV === 'production' ? false : 'eval-cheap-module-source-map'
}; 