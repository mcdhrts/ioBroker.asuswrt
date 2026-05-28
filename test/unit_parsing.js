const { expect } = require('chai');
const { parseNeighborOutput } = require('../lib/parsing');

describe('Parsing Logic', () => {
    it('should parse standard ip neigh output', () => {
        const output = '192.168.1.154 dev br0 lladdr 04:d9:f5:12:34:56 STALE';
        const result = parseNeighborOutput(output);
        expect(result).to.have.lengthOf(1);
        expect(result[0].mac).to.equal('04d9f5123456');
        expect(result[0].tokens[0]).to.equal('192.168.1.154'); // IP
        expect(result[0].tokens[4]).to.equal('04:d9:f5:12:34:56'); // MAC
        expect(result[0].tokens[5]).to.equal('STALE'); // Status
    });

    it('should parse output with multiple spaces', () => {
        const output = '192.168.1.154  dev  br0  lladdr  04:d9:f5:12:34:56  STALE';
        const result = parseNeighborOutput(output);
        expect(result).to.have.lengthOf(1);
        expect(result[0].mac).to.equal('04d9f5123456');
        expect(result[0].tokens[0]).to.equal('192.168.1.154');
        expect(result[0].tokens[4]).to.equal('04:d9:f5:12:34:56');
        expect(result[0].tokens[5]).to.equal('STALE');
    });

    it('should ignore lines without MAC address', () => {
        const output = '192.168.1.1 dev br0 FAILED';
        const result = parseNeighborOutput(output);
        expect(result).to.have.lengthOf(0);
    });

    it('should handle multiple lines', () => {
        const output = `
192.168.1.154 dev br0 lladdr 04:d9:f5:12:34:56 STALE
192.168.1.155 dev br0 lladdr 04:d9:f5:12:34:57 REACHABLE
        `;
        const result = parseNeighborOutput(output);
        expect(result).to.have.lengthOf(2);
        expect(result[0].mac).to.equal('04d9f5123456');
        expect(result[1].mac).to.equal('04d9f5123457');
    });
});
