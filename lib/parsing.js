"use strict";

/**
 * Parses the output of the `ip neigh` command.
 *
 * @param {string} output - The stdout from the command.
 * @returns {Array<{mac: string, ip: string, status: string, raw: string[]}>} - Parsed devices.
 */
function parseNeighborOutput(output) {
  const devices = [];
  const lines = String(output).split("\n");
  lines.forEach((line) => {
    const macRegex = /([0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}/;
    const match = line.match(macRegex);
    if (match) {
      const mac = match[0].replace(/:/g, "").toLowerCase();
      // Use regex to split by one or more whitespace characters
      const arraystdout = line.trim().split(/\s+/);

      // arraystdout structure usually: [ip, dev, interface, lladdr, mac, status]
      // But it varies. We need to be careful.
      // The original code used:
      // const realmac = arraystdout[4];
      // const ip_address = arraystdout[0];
      // const actualstatus = arraystdout[5];

      // Let's try to map it based on the split.
      // Example: 192.168.1.154 dev br0 lladdr 04:d9:f5:x:x:x STALE
      // split(" "): ["192.168.1.154", "dev", "br0", "lladdr", "04:d9:f5:...", "STALE"]
      // Indices: 0=ip, 4=mac, 5=status.

      // If there are extra spaces and we use split(" "), we get empty strings.
      // If we use split(/\s+/), we get clean tokens.

      // We will return the raw array so the main logic can pick what it needs,
      // or we can normalize it here.
      // To keep changes minimal in main.js, let's just return the structure expected or let main.js handle the array.
      // But main.js expects `arraystdout` to be the split array.
      // So let's just return the split array and the mac.

      devices.push({
        mac: mac,
        tokens: arraystdout,
      });
    }
  });
  return devices;
}

module.exports = {
  parseNeighborOutput,
};
