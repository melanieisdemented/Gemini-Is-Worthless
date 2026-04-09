import DOMException from './local-domexception/index.js';
console.log(typeof DOMException);
try {
  throw new DOMException('test', 'TestError');
} catch (e) {
  console.log(e.name, e.message);
}
