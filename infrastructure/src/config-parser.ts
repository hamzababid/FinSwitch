import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Docker Compose Service Configuration
 */
export interface ServiceConfig {
  image?: string;
  build?: {
    context: string;
    dockerfile?: string;
  };
  container_name?: string;
  ports?: string[];
  environment?: Record<string, string> | string[];
  depends_on?: Record<string, { condition: string }> | string[];
  healthcheck?: {
    test: string | string[];
    interval?: string;
    timeout?: string;
    retries?: number;
  };
  volumes?: string[];
  networks?: string[];
  restart?: string;
  command?: string | string[];
}

/**
 * Docker Compose Configuration
 */
export interface DockerComposeConfig {
  version: string;
  services: Record<string, ServiceConfig>;
  networks?: Record<string, any>;
  volumes?: Record<string, any>;
}

/**
 * Configuration Parser for Docker Compose files
 */
export class ConfigurationParser {
  /**
   * Parse a Docker Compose YAML file into a configuration object
   */
  static parseFile(filePath: string): DockerComposeConfig {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      return this.parseYAML(fileContent);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to parse configuration file: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Parse YAML string into a configuration object
   */
  static parseYAML(yamlContent: string): DockerComposeConfig {
    try {
      const config = yaml.load(yamlContent) as DockerComposeConfig;
      
      if (!config || typeof config !== 'object') {
        throw new Error('Invalid configuration: not an object');
      }

      return config;
    } catch (error) {
      if (error instanceof yaml.YAMLException) {
        throw new Error(
          `YAML parsing error at line ${error.mark?.line}: ${error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Convert configuration object back to YAML string
   */
  static toYAML(config: DockerComposeConfig): string {
    try {
      return yaml.dump(config, {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
        sortKeys: false
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to serialize configuration: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Round-trip test: parse YAML, convert back to YAML, parse again
   * Returns true if the configurations are equivalent
   */
  static roundTrip(config: DockerComposeConfig): DockerComposeConfig {
    const yamlString = this.toYAML(config);
    return this.parseYAML(yamlString);
  }
}

/**
 * Configuration Validator
 */
export class ConfigurationValidator {
  /**
   * Validate that all required fields are present
   */
  static validateRequiredFields(config: DockerComposeConfig): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check version
    if (!config.version) {
      errors.push('Missing required field: version');
    }

    // Check services
    if (!config.services || typeof config.services !== 'object') {
      errors.push('Missing required field: services');
      return { valid: false, errors };
    }

    // Validate each service
    Object.entries(config.services).forEach(([serviceName, service]) => {
      // Each service must have either image or build
      if (!service.image && !service.build) {
        errors.push(
          `Service '${serviceName}': must have either 'image' or 'build' field`
        );
      }

      // Validate ports format
      if (service.ports) {
        if (!Array.isArray(service.ports)) {
          errors.push(`Service '${serviceName}': ports must be an array`);
        }
      }

      // Validate environment format
      if (service.environment) {
        const isArray = Array.isArray(service.environment);
        const isObject = typeof service.environment === 'object' && !isArray;
        if (!isArray && !isObject) {
          errors.push(
            `Service '${serviceName}': environment must be an array or object`
          );
        }
      }

      // Validate depends_on format
      if (service.depends_on) {
        const isArray = Array.isArray(service.depends_on);
        const isObject = typeof service.depends_on === 'object' && !isArray;
        if (!isArray && !isObject) {
          errors.push(
            `Service '${serviceName}': depends_on must be an array or object`
          );
        }
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate data types and value ranges
   */
  static validateDataTypes(config: DockerComposeConfig): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Validate version is a string
    if (typeof config.version !== 'string') {
      errors.push('Field "version" must be a string');
    }

    // Validate services is an object
    if (typeof config.services !== 'object' || Array.isArray(config.services)) {
      errors.push('Field "services" must be an object');
      return { valid: false, errors };
    }

    // Validate each service configuration
    Object.entries(config.services).forEach(([serviceName, service]) => {
      // Validate image is a string if present
      if (service.image !== undefined && typeof service.image !== 'string') {
        errors.push(`Service '${serviceName}': image must be a string`);
      }

      // Validate build is an object if present
      if (service.build !== undefined) {
        if (typeof service.build === 'string') {
          // Build can be a string (context path) - this is valid
        } else if (typeof service.build !== 'object') {
          errors.push(`Service '${serviceName}': build must be an object or string`);
        }
      }

      // Validate container_name is a string if present
      if (
        service.container_name !== undefined &&
        typeof service.container_name !== 'string'
      ) {
        errors.push(`Service '${serviceName}': container_name must be a string`);
      }

      // Validate healthcheck retries is a number if present
      if (service.healthcheck?.retries !== undefined) {
        if (typeof service.healthcheck.retries !== 'number') {
          errors.push(
            `Service '${serviceName}': healthcheck.retries must be a number`
          );
        } else if (service.healthcheck.retries < 1) {
          errors.push(
            `Service '${serviceName}': healthcheck.retries must be at least 1`
          );
        }
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Comprehensive validation
   */
  static validate(config: DockerComposeConfig): {
    valid: boolean;
    errors: string[];
  } {
    const requiredFieldsResult = this.validateRequiredFields(config);
    const dataTypesResult = this.validateDataTypes(config);

    return {
      valid: requiredFieldsResult.valid && dataTypesResult.valid,
      errors: [...requiredFieldsResult.errors, ...dataTypesResult.errors]
    };
  }
}
