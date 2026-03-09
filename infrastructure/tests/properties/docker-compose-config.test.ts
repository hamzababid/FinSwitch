import * as fc from 'fast-check';
import * as path from 'path';
import {
  ConfigurationParser,
  ConfigurationValidator,
  DockerComposeConfig,
  ServiceConfig
} from '../../src/config-parser';

/**
 * Feature: finswitch-platform
 * Property 48: Configuration Parsing Round-Trip
 * 
 * For any valid configuration object, parsing to YAML then parsing back 
 * should produce an equivalent configuration object.
 * 
 * Validates: Requirements 15.6
 */

// Property test configuration
const propertyTestConfig = {
  numRuns: 100,
  verbose: true
};

// Arbitraries (generators) for Docker Compose configuration

const serviceNameArb = fc.stringMatching(/^[a-z][a-z0-9-]{2,20}$/);

const portMappingArb = fc.oneof(
  fc.tuple(fc.integer({ min: 1000, max: 9999 }), fc.integer({ min: 1000, max: 9999 }))
    .map(([host, container]) => `${host}:${container}`),
  fc.integer({ min: 1000, max: 9999 }).map(port => `${port}`)
);

const environmentVarArb = fc.record({
  key: fc.stringMatching(/^[A-Z_][A-Z0-9_]{2,30}$/),
  value: fc.oneof(
    fc.string({ minLength: 1, maxLength: 100 }),
    fc.integer({ min: 1, max: 65535 }).map(String),
    fc.constantFrom('development', 'production', 'test')
  )
});

const healthcheckArb = fc.record({
  test: fc.oneof(
    fc.constant(['CMD', 'curl', '-f', 'http://localhost/health']),
    fc.constant('echo "healthy"')
  ),
  interval: fc.constantFrom('10s', '30s', '60s'),
  timeout: fc.constantFrom('3s', '5s', '10s'),
  retries: fc.integer({ min: 1, max: 10 })
});

const serviceConfigArb: fc.Arbitrary<ServiceConfig> = fc.record({
  image: fc.option(
    fc.oneof(
      fc.constant('mongo:6.0'),
      fc.constant('redis:7-alpine'),
      fc.constant('node:18-alpine')
    ),
    { nil: undefined }
  ),
  build: fc.option(
    fc.record({
      context: fc.constantFrom('.', './services/user-service', './portal/backend'),
      dockerfile: fc.option(fc.constant('Dockerfile'), { nil: undefined })
    }),
    { nil: undefined }
  ),
  container_name: fc.option(
    fc.stringMatching(/^[a-z][a-z0-9-]{5,30}$/),
    { nil: undefined }
  ),
  ports: fc.option(
    fc.array(portMappingArb, { minLength: 1, maxLength: 3 }),
    { nil: undefined }
  ),
  environment: fc.option(
    fc.oneof(
      // Object format
      fc.array(environmentVarArb, { minLength: 1, maxLength: 10 })
        .map(vars => Object.fromEntries(vars.map(v => [v.key, v.value]))),
      // Array format
      fc.array(environmentVarArb, { minLength: 1, maxLength: 10 })
        .map(vars => vars.map(v => `${v.key}=${v.value}`))
    ),
    { nil: undefined }
  ),
  depends_on: fc.option(
    fc.oneof(
      // Object format with conditions
      fc.array(serviceNameArb, { minLength: 1, maxLength: 3 })
        .map(names => Object.fromEntries(
          names.map(name => [name, { condition: 'service_healthy' }])
        )),
      // Simple array format
      fc.array(serviceNameArb, { minLength: 1, maxLength: 3 })
    ),
    { nil: undefined }
  ),
  healthcheck: fc.option(healthcheckArb, { nil: undefined }),
  volumes: fc.option(
    fc.array(
      fc.stringMatching(/^[a-z_-]+:\/[a-z\/]+$/),
      { minLength: 1, maxLength: 3 }
    ),
    { nil: undefined }
  ),
  networks: fc.option(
    fc.array(fc.constant('finswitch-network'), { minLength: 1, maxLength: 1 }),
    { nil: undefined }
  ),
  restart: fc.option(
    fc.constantFrom('no', 'always', 'on-failure', 'unless-stopped'),
    { nil: undefined }
  )
}).filter(service => {
  // Ensure at least image or build is present
  return service.image !== undefined || service.build !== undefined;
});

const dockerComposeConfigArb: fc.Arbitrary<DockerComposeConfig> = fc.record({
  version: fc.constantFrom('3.8', '3.9', '3'),
  services: fc.dictionary(
    serviceNameArb,
    serviceConfigArb,
    { minKeys: 2, maxKeys: 5 }
  ),
  networks: fc.option(
    fc.constant({
      'finswitch-network': {
        driver: 'bridge'
      }
    }),
    { nil: undefined }
  ),
  volumes: fc.option(
    fc.constant({
      'mongodb_data': { driver: 'local' },
      'redis_data': { driver: 'local' }
    }),
    { nil: undefined }
  )
});

describe('Feature: finswitch-platform, Property 48: Configuration Parsing Round-Trip', () => {
  describe('Docker Compose Configuration Parser', () => {
    it('should parse the actual docker-compose.yml file', () => {
      const dockerComposePath = path.join(__dirname, '../../../docker-compose.yml');
      
      expect(() => {
        const config = ConfigurationParser.parseFile(dockerComposePath);
        expect(config).toBeDefined();
        expect(config.version).toBeDefined();
        expect(config.services).toBeDefined();
      }).not.toThrow();
    });

    it('should validate the actual docker-compose.yml file', () => {
      const dockerComposePath = path.join(__dirname, '../../../docker-compose.yml');
      const config = ConfigurationParser.parseFile(dockerComposePath);
      
      const validation = ConfigurationValidator.validate(config);
      
      if (!validation.valid) {
        console.error('Validation errors:', validation.errors);
      }
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should have all required services in docker-compose.yml', () => {
      const dockerComposePath = path.join(__dirname, '../../../docker-compose.yml');
      const config = ConfigurationParser.parseFile(dockerComposePath);
      
      const requiredServices = [
        'mongodb',
        'redis',
        'user-service',
        'routing-engine',
        'issuer-simulator',
        'payment-service',
        'settlement-service',
        'reconciliation-service',
        'api-gateway',
        'portal-backend',
        'portal-frontend'
      ];
      
      requiredServices.forEach(serviceName => {
        expect(config.services[serviceName]).toBeDefined();
      });
    });

    it('should have correct port mappings for services', () => {
      const dockerComposePath = path.join(__dirname, '../../../docker-compose.yml');
      const config = ConfigurationParser.parseFile(dockerComposePath);
      
      const expectedPorts: Record<string, string> = {
        'mongodb': '27017:27017',
        'redis': '6379:6379',
        'api-gateway': '3000:3000',
        'payment-service': '3001:3001',
        'routing-engine': '3002:3002',
        'issuer-simulator': '3003:3003',
        'settlement-service': '3004:3004',
        'reconciliation-service': '3005:3005',
        'user-service': '3006:3006',
        'portal-frontend': '4000:4000',
        'portal-backend': '4001:4001'
      };
      
      Object.entries(expectedPorts).forEach(([serviceName, expectedPort]) => {
        const service = config.services[serviceName];
        expect(service).toBeDefined();
        expect(service.ports).toBeDefined();
        expect(service.ports).toContain(expectedPort);
      });
    });
  });

  describe('Property 48: Configuration Parsing Round-Trip', () => {
    /**
     * **Validates: Requirements 15.6**
     * 
     * For ALL valid Configuration objects, parsing then printing then parsing 
     * SHALL produce an equivalent object (round-trip property)
     */
    it('should maintain configuration equivalence through round-trip parsing', () => {
      fc.assert(
        fc.property(dockerComposeConfigArb, (originalConfig) => {
          // Round-trip: config -> YAML -> config
          const roundTrippedConfig = ConfigurationParser.roundTrip(originalConfig);
          
          // Verify version is preserved
          expect(roundTrippedConfig.version).toBe(originalConfig.version);
          
          // Verify all services are preserved
          const originalServiceNames = Object.keys(originalConfig.services).sort();
          const roundTrippedServiceNames = Object.keys(roundTrippedConfig.services).sort();
          expect(roundTrippedServiceNames).toEqual(originalServiceNames);
          
          // Verify each service configuration is preserved
          originalServiceNames.forEach(serviceName => {
            const original = originalConfig.services[serviceName];
            const roundTripped = roundTrippedConfig.services[serviceName];
            
            // Check image
            expect(roundTripped.image).toEqual(original.image);
            
            // Check container_name
            expect(roundTripped.container_name).toEqual(original.container_name);
            
            // Check ports (order may differ, so sort)
            if (original.ports) {
              expect(roundTripped.ports).toBeDefined();
              expect([...roundTripped.ports!].sort()).toEqual([...original.ports].sort());
            }
            
            // Check restart policy
            expect(roundTripped.restart).toEqual(original.restart);
            
            // Check networks
            if (original.networks) {
              expect(roundTripped.networks).toBeDefined();
              expect([...roundTripped.networks!].sort()).toEqual([...original.networks].sort());
            }
          });
          
          // Verify networks are preserved
          if (originalConfig.networks) {
            expect(roundTrippedConfig.networks).toBeDefined();
            const originalNetworkNames = Object.keys(originalConfig.networks).sort();
            const roundTrippedNetworkNames = Object.keys(roundTrippedConfig.networks!).sort();
            expect(roundTrippedNetworkNames).toEqual(originalNetworkNames);
          }
          
          // Verify volumes are preserved
          if (originalConfig.volumes) {
            expect(roundTrippedConfig.volumes).toBeDefined();
            const originalVolumeNames = Object.keys(originalConfig.volumes).sort();
            const roundTrippedVolumeNames = Object.keys(roundTrippedConfig.volumes!).sort();
            expect(roundTrippedVolumeNames).toEqual(originalVolumeNames);
          }
        }),
        propertyTestConfig
      );
    });

    it('should preserve service dependencies through round-trip', () => {
      fc.assert(
        fc.property(dockerComposeConfigArb, (originalConfig) => {
          const roundTrippedConfig = ConfigurationParser.roundTrip(originalConfig);
          
          Object.keys(originalConfig.services).forEach(serviceName => {
            const original = originalConfig.services[serviceName];
            const roundTripped = roundTrippedConfig.services[serviceName];
            
            if (original.depends_on) {
              expect(roundTripped.depends_on).toBeDefined();
              
              // Handle both array and object formats
              if (Array.isArray(original.depends_on)) {
                if (Array.isArray(roundTripped.depends_on)) {
                  expect([...roundTripped.depends_on].sort()).toEqual(
                    [...original.depends_on].sort()
                  );
                }
              } else {
                // Object format
                const originalDeps = Object.keys(original.depends_on).sort();
                const roundTrippedDeps = Array.isArray(roundTripped.depends_on)
                  ? roundTripped.depends_on.sort()
                  : Object.keys(roundTripped.depends_on).sort();
                expect(roundTrippedDeps).toEqual(originalDeps);
              }
            }
          });
        }),
        propertyTestConfig
      );
    });

    it('should preserve environment variables through round-trip', () => {
      fc.assert(
        fc.property(dockerComposeConfigArb, (originalConfig) => {
          const roundTrippedConfig = ConfigurationParser.roundTrip(originalConfig);
          
          Object.keys(originalConfig.services).forEach(serviceName => {
            const original = originalConfig.services[serviceName];
            const roundTripped = roundTrippedConfig.services[serviceName];
            
            if (original.environment) {
              expect(roundTripped.environment).toBeDefined();
              
              // Convert both to comparable format (object)
              const normalizeEnv = (env: Record<string, string> | string[]) => {
                if (Array.isArray(env)) {
                  return Object.fromEntries(
                    env.map(e => {
                      const [key, ...valueParts] = e.split('=');
                      return [key, valueParts.join('=')];
                    })
                  );
                }
                return env;
              };
              
              const originalEnv = normalizeEnv(original.environment);
              const roundTrippedEnv = normalizeEnv(roundTripped.environment!);
              
              expect(roundTrippedEnv).toEqual(originalEnv);
            }
          });
        }),
        propertyTestConfig
      );
    });

    it('should preserve healthcheck configuration through round-trip', () => {
      fc.assert(
        fc.property(dockerComposeConfigArb, (originalConfig) => {
          const roundTrippedConfig = ConfigurationParser.roundTrip(originalConfig);
          
          Object.keys(originalConfig.services).forEach(serviceName => {
            const original = originalConfig.services[serviceName];
            const roundTripped = roundTrippedConfig.services[serviceName];
            
            if (original.healthcheck) {
              expect(roundTripped.healthcheck).toBeDefined();
              expect(roundTripped.healthcheck!.interval).toEqual(original.healthcheck.interval);
              expect(roundTripped.healthcheck!.timeout).toEqual(original.healthcheck.timeout);
              expect(roundTripped.healthcheck!.retries).toEqual(original.healthcheck.retries);
            }
          });
        }),
        propertyTestConfig
      );
    });
  });

  describe('Configuration Validation', () => {
    it('should reject configuration missing required fields', () => {
      const invalidConfigs = [
        { services: {} }, // Missing version
        { version: '3.8' }, // Missing services
        { version: '3.8', services: { 'test-service': {} } } // Service missing image/build
      ];
      
      invalidConfigs.forEach(config => {
        const validation = ConfigurationValidator.validateRequiredFields(
          config as DockerComposeConfig
        );
        expect(validation.valid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);
      });
    });

    it('should reject configuration with invalid data types', () => {
      const invalidConfig: any = {
        version: 123, // Should be string
        services: {
          'test-service': {
            image: 'node:18',
            ports: 'invalid', // Should be array
            healthcheck: {
              retries: 'invalid' // Should be number
            }
          }
        }
      };
      
      const validation = ConfigurationValidator.validateDataTypes(invalidConfig);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should accept valid configuration', () => {
      fc.assert(
        fc.property(dockerComposeConfigArb, (config) => {
          const validation = ConfigurationValidator.validate(config);
          
          // All generated configs should be valid
          if (!validation.valid) {
            console.error('Generated invalid config:', JSON.stringify(config, null, 2));
            console.error('Validation errors:', validation.errors);
          }
          
          expect(validation.valid).toBe(true);
          expect(validation.errors).toHaveLength(0);
        }),
        propertyTestConfig
      );
    });
  });
});
