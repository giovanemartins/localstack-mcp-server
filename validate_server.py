import json
import sys

with open('server.json', 'r') as f:
    server = json.load(f)

# Check required fields
required_fields = ['$schema', 'name', 'description', 'version', 'packages']
for field in required_fields:
    if field not in server:
        print(f"✗ Missing required field: {field}")
        sys.exit(1)

# Validate schema reference
if not server['$schema'].startswith('https://static.modelcontextprotocol.io/schemas/'):
    print(f"✗ Invalid schema URL: {server['$schema']}")
    sys.exit(1)

# Validate name format
if not server['name'].startswith('io.github.'):
    print(f"⚠ Warning: Name doesn't follow io.github.* pattern: {server['name']}")

# Validate packages
if not isinstance(server['packages'], list) or len(server['packages']) == 0:
    print("✗ Packages must be a non-empty array")
    sys.exit(1)

for i, pkg in enumerate(server['packages']):
    required_pkg_fields = ['registryType', 'identifier', 'version', 'transport']
    for field in required_pkg_fields:
        if field not in pkg:
            print(f"✗ Package {i} missing required field: {field}")
            sys.exit(1)

print("✓ server.json is valid according to MCP schema requirements")
print(f"  Name: {server['name']}")
print(f"  Version: {server['version']}")
print(f"  Description: {server['description'][:60]}...")
print(f"  Packages: {len(server['packages'])} package(s)")
for i, pkg in enumerate(server['packages'], 1):
    print(f"    {i}. {pkg['registryType']}: {pkg['identifier']} v{pkg['version']}")
    print(f"       Transport: {pkg['transport']['type']}")
    env_vars = pkg.get('environmentVariables', [])
    if env_vars:
        print(f"       Environment variables: {len(env_vars)} configured")
