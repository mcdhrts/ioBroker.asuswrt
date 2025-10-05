# ioBroker.asuswrt - Claude AI Context

## Project Overview

**ioBroker.asuswrt** is an ioBroker adapter that monitors active devices on ASUS routers running ASUSWRT firmware via SSH. It's primarily used for presence detection (e.g., tracking if family members' phones are connected to the home network).

- **Repository**: https://github.com/mcdhrts/ioBroker.asuswrt
- **Version**: 1.0.1
- **License**: MIT
- **Author**: mcdhrts <mcdhrts@outlook.com>
- **Node Version**: >=20
- **ioBroker Requirements**: js-controller >=6.0.11, admin >=7.6.17

## Core Functionality

### What It Does
1. Connects to ASUS routers via SSH (port 22 by default)
2. Executes `ip neigh` command to retrieve active network devices
3. Monitors configured MAC addresses for presence/absence
4. Creates ioBroker states for each monitored device with:
   - Active status (boolean)
   - Last seen timestamp
   - IP address
   - MAC address
   - Connection status

### Key Features
- **SSH2 persistent connections** - Maintains single SSH session with keepalive
- **Password or SSH key authentication** - Supports both methods
- **Configurable polling intervals** - Minimum 5 seconds
- **Auto-reconnect** - Attempts reconnection on SSH failures
- **Device timeout** - Marks devices inactive after configurable period (min 60s)
- **Compact mode support** - Can run in ioBroker compact mode

## Architecture

### Main Components

#### 1. SSH Connection Management
- Uses `ssh2` npm package for SSH connections
- Maintains persistent connection with 60s keepalive
- Auto-reconnection logic with 90s retry interval
- Supports both password and private key authentication (with optional passphrase)

#### 2. Device Polling
- Executes `PATH=$PATH:/bin:/usr/sbin:/sbin && ip neigh` on router
- Parses output to extract device information
- Default polling: every 15 seconds (configurable, min 5s)
- Separate thread checks device activity every 30 seconds

#### 3. State Management
Each device creates 5 states:
- `{mac}.active` - Boolean presence status
- `{mac}.last_time_seen_active` - Timestamp string (YYYY.MM.DD HH:MM:SS)
- `{mac}.ip_address` - Last known IP address
- `{mac}.mac` - MAC address
- `{mac}.last_status` - Router status (REACHABLE, STALE, etc.)

#### 4. Configuration Sync
- Compares config devices with existing states
- Adds/removes devices based on configuration changes
- Updates device names if changed in config

### File Structure
```
ioBroker.asuswrt/
├── main.js              # Main adapter logic (21KB)
├── io-package.json      # Adapter metadata and configuration schema
├── package.json         # NPM package definition
├── admin/               # Admin UI files (HTML/CSS/images)
│   ├── index_m.html     # Configuration interface
│   ├── asuswrt.png      # Adapter icon
│   └── ...
├── test/                # Test suite
└── LICENSE              # MIT license
```

## Configuration Parameters

### Required
- **asus_ip** - Router IP address or hostname
- **asus_user** - SSH username (default: "admin")
- **ssh_port** - SSH port (default: 22)

### Authentication (one required)
- **asus_pw** - SSH password
- **keyfile** - Path to SSH private key file
- **keyfile_passphrase** - Passphrase for encrypted key file (optional)

### Intervals
- **interval** - Device polling interval in ms (min 5000, default 15000)
- **active_interval** - Time until device marked inactive in ms (min 60000, default 180000)

### Devices
Array of devices to monitor:
```json
{
  "mac": "AA:BB:CC:DD:EE:FF",
  "name": "John's Phone",
  "active": true
}
```

## Code Quality & Patterns

### Strengths
✓ Persistent SSH connection with keepalive
✓ Graceful error handling with auto-reconnect
✓ Input validation for IPs, MACs, intervals
✓ Device state synchronization
✓ Configurable timeout detection
✓ Compact mode support

### Areas for Improvement
⚠ Uses older JavaScript patterns (ES5 callbacks, var instead of let/const)
⚠ Limited test coverage
⚠ No TypeScript definitions
⚠ Travis CI config present but deprecated (consider GitHub Actions)
⚠ Hard-coded 90s reconnect delay
⚠ No structured logging levels
⚠ Direct modification of adapter.config values

## Common Development Tasks

### Adding Features
1. **New device properties**: Add state in `createDevice()` function, update parsing in `updateDeviceSSH2()`
2. **Additional router commands**: Modify `deviceCommand` constant and parsing logic
3. **Enhanced authentication**: Update `checkKeyFile()` and SSH connection config
4. **UI improvements**: Modify `admin/index_m.html`

### Testing Changes
```bash
npm run test           # All tests
npm run test:package   # Package validation
npm run test:unit      # Unit tests
npm run test:integration  # Integration tests
```

### Debugging
- Enable debug logs in ioBroker admin interface
- Check `adapter.log.debug()` calls in main.js
- SSH connection issues logged as errors
- Device updates logged at debug level

## Dependencies

### Runtime
- **ssh2** (^1.17.0) - SSH2 client for persistent connections
- **@iobroker/adapter-core** (^3.3.2) - ioBroker adapter framework

### Development
- **@iobroker/testing** (^5.1.1) - Testing utilities

## Known Limitations

1. **ASUSWRT firmware only** - Not compatible with all ASUS routers (see: https://event.asus.com/2013/nw/ASUSWRT/)
2. **Single router** - Cannot monitor multiple routers simultaneously
3. **IPv4 focus** - `ip neigh` command may not capture all IPv6 devices
4. **MAC address based** - Randomized MAC addresses (iOS/Android privacy features) not supported
5. **No device classification** - All devices treated equally
6. **Tested on limited models** - Primarily tested on GT-AC5300 with ASUSWRT 3.0.0.4.384_32799

## Typical Use Cases

1. **Home presence detection** - Track family members via smartphones
2. **Smart home automation** - Trigger scenes when people arrive/leave
3. **Network monitoring** - Monitor IoT device connectivity
4. **Security alerts** - Notify on unknown device connections
5. **Parental controls** - Track children's device usage patterns

## Integration Examples

### Trigger automation when user comes home:
```javascript
// In ioBroker script
on({id: 'asuswrt.0.aabbccddeeff.active', change: 'ne'}, function(obj) {
  if (obj.state.val === true) {
    // User arrived - turn on lights, etc.
    setState('lights.living_room', true);
  }
});
```

### Check if anyone is home:
```javascript
// Read all device states and check if any are active
var anyoneHome = false;
$('asuswrt.0.*.active').each(function(id, i) {
  if (getState(id).val === true) {
    anyoneHome = true;
  }
});
```

## Version History Highlights

- **1.0.1** (2019-03-22) - Added compact mode support
- **1.0.0** (2019-01-13) - SSH key file support, 5s minimum polling, removed simple-ssh
- **0.3.0** (2018-12-31) - Code review changes, 10s minimum polling
- **0.2.0** (2018-12-17) - Added persistent SSH2 connection
- **0.1.0** (2018-12-10) - First complete beta version

## Error Handling Patterns

### SSH Connection Errors
- Logs error message
- Sets `stopExecute = true` to halt polling
- Attempts reconnection after 90 seconds
- Falls back from key file to password if key file not found

### Device Update Errors
- Catches "Not connected" errors specifically
- Triggers reconnection sequence
- Logs all other errors without stopping

### Validation Errors
- Validates all config parameters in `validateConfig()`
- Stops adapter if validation fails
- Provides clear error messages for each issue

## Performance Considerations

- **Polling frequency**: 5s minimum, but 15s+ recommended for production
- **Device count**: No hard limit, but SSH command overhead scales linearly
- **Memory**: Minimal (~10-20MB), state-based with no history
- **CPU**: Low impact, mostly idle waiting for intervals
- **Network**: Single SSH connection, minimal bandwidth (<1KB per poll)

## Security Notes

- SSH credentials stored in ioBroker config (encrypted at rest)
- Private keys should use 600 permissions on filesystem
- Recommend dedicated SSH user on router with minimal privileges
- No direct internet exposure required (local network only)
- MAC addresses considered semi-sensitive PII

## Support & Contribution

- **Issues**: https://github.com/mcdhrts/ioBroker.asuswrt/issues
- **NPM**: https://www.npmjs.com/package/iobroker.asuswrt
- **ioBroker Forum**: Search for "asuswrt" in community forums

When contributing:
1. Maintain backward compatibility
2. Follow existing code style (consider ESLint addition)
3. Add tests for new features
4. Update README.md and io-package.json
5. Test on actual ASUS hardware if possible

## Future Enhancement Ideas

- TypeScript migration for better type safety
- Support for multiple routers
- Device grouping/categorization
- Historical presence data (optional)
- Web UI for device visualization
- Support for additional router commands (bandwidth, signal strength)
- GitHub Actions CI/CD pipeline
- Docker support for development
- Enhanced error recovery strategies
