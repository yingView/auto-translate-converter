const fs = require('fs');
const path = require('path');
const glob = require('glob');
const babylon = require('babylon');
const recast = require('recast');
const config = require('./config');

// 

const utils = {
  /**
   * 匹配中文正则  
   * https://stackoverflow.com/questions/21109011/javascript-unicode-string-chinese-character-but-no-punctuation
   */
  chnRegExp: /[\u4E00-\u9FCC\u3400-\u4DB5\uFA0E\uFA0F\uFA11\uFA13\uFA14\uFA1F\uFA21\uFA23\uFA24\uFA27-\uFA29]|[\ud840-\ud868][\udc00-\udfff]|\ud869[\udc00-\uded6\udf00-\udfff]|[\ud86a-\ud86c][\udc00-\udfff]|\ud86d[\udc00-\udf34\udf40-\udfff]|\ud86e[\udc00-\udc1d]/,
  /**
   * 获取脚本执行绝对路径
   * @param {array} args 
   */
  p(...args) {
    return path.join(process.cwd(), ...args);
  },
  /**
   * 获取要替换的文件路径
   */
  getFiles() {
    const filePath = config.argvPath 
      ? utils.isFolder(config.argvPath) 
        ? `${utils.p(config.argvPath)}/**/*.js` 
        : utils.p(config.argvPath) 
      : `${utils.p(config.root)}/**/*.js`;
    const ignorePath = config.ignore.map(n => {
      return `${utils.p(config.root)}/${n}/**/*.js`;
    });
    return glob.sync(filePath, {
      ignore: ignorePath
    }).map(v => v.substring(process.cwd().length));
  },
  /**
   * 将文件转换为AST
   * @param {string} file
   */
  getAST(file) {
    const code = fs.readFileSync(utils.p(file), 'utf8');
    const parseOptions = {
      parser: {
        parse: function(source) {
          return babylon.parse(source, {
            allowImportExportEverywhere: true,
            plugins: ['jsx', 'objectRestSpread', 'decorators', 'exportExtensions', 'classProperties']
          })
        }
      }
    };
    let ast;
    try {
      ast = recast.parse(code, parseOptions);
    }catch(e) {
      throw new Error(`file ${file} parse ast error`);
    }
    return ast;
  },
  /**
   * 遍历AST
   * @param {Object} ast
   * @param {Function} cb
   */
  visitAST(ast, cb) {
    recast.visit(ast, {
      visitLiteral: function(path){
        const v = path.node.value;
        cb(path);
        this.traverse(path);
      },
      visitJSXText: function(path){
        cb(path);
        this.traverse(path);
      }
    });
  },
  /**
   * 判断路径是否为文件
   * @param {string} path
   */
  isFile(fp) {
    return fs.statSync(fp).isFile();
  },
  /**
   * 判断路径是否为文件夹
   * @param {string} path
   */
  isFolder(fp) {
    return fs.statSync(fp).isDirectory();
  },
};

module.exports = utils;