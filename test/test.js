'use strict';

const assert = require('assert');
const serveLocally = require('..');
const path = require('path');
const expect = require('chai').expect;
const sinon = require('sinon');


describe('serveLocally()', () => {
    it('should export serveLocally', () => {
        assert(typeof serveLocally == 'function');
    });

    it('should find simple local paths', () => {
        let opts = {root: './test/test_dirs'};
        let path = serveLocally.locateFilePath('/path1/path2/resource', null, opts);
        expect(path).to.be.equal('test/test_dirs/path1/path2/resource.json');
    });

    it('should export file data', () => {
        let spy = sinon.stub()
        let instance = serveLocally({root: './test/test_dirs'});
        let data = instance({path: '/path1/path2/resource', query: null}, {json: spy});
        // FIXME actually test this
    });

    it('should handle query params', () => {
        let opts = {root: './test/test_dirs'};
        let path = serveLocally.locateFilePath('/path1/path2/resource', {'foo': 'bar'}, opts);
        expect(path).to.be.equal('test/test_dirs/path1/path2/resource?foo=bar.json');
    });
});
