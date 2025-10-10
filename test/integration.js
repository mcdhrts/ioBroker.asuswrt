const path = require("path");
const { tests } = require("@iobroker/testing");
const { expect } = require("chai");

// Run integration tests - See https://github.com/ioBroker/testing for a detailed explanation and further options
tests.integration(path.join(__dirname, ".."), {
  // Allow exit code 11 (adapter cannot connect) since we don't have a real router in tests
  allowedExitCodes: [11],

  // Define additional adapter-specific tests
  defineAdditionalTests({ suite }) {
    suite("Adapter startup", (getHarness) => {
      it("Should start the adapter without crashing", async function () {
        this.timeout(10000);
        const harness = getHarness();

        // Start adapter - it will attempt to connect but that's expected to fail in test environment
        await harness.startAdapterAndWait();

        // Check that adapter object exists
        const adapterObject = await harness.objects.getObjectAsync(
          "system.adapter.asuswrt.0",
        );
        expect(adapterObject).to.exist;
        expect(adapterObject.common.name).to.equal("asuswrt");
      });
    });

    suite("Adapter configuration", (getHarness) => {
      it("Should have correct default configuration", async function () {
        this.timeout(5000);
        const harness = getHarness();

        // Check native configuration structure
        const adapterObject = await harness.objects.getObjectAsync(
          "system.adapter.asuswrt.0",
        );
        expect(adapterObject.native).to.have.property("asus_ip");
        expect(adapterObject.native).to.have.property("asus_user");
        expect(adapterObject.native).to.have.property("asus_pw");
        expect(adapterObject.native).to.have.property("interval");
        expect(adapterObject.native).to.have.property("ssh_port");
        expect(adapterObject.native).to.have.property("keyfile");
      });
    });
  },
});
