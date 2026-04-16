import { assert, test } from 'vitest'
import {
  DEFAULT_ASAAS_BASE_URL,
  detectAsaasEnvironmentFromBaseUrl,
  getAsaasBaseUrl,
  normalizeAsaasBaseUrl,
  normalizeAsaasEnvironment,
  normalizeAsaasSecret,
} from './asaas-config'

test('normalizeAsaasBaseUrl trims and removes trailing slash', () => {
  assert.equal(
    normalizeAsaasBaseUrl(' https://api-sandbox.asaas.com/v3/ '),
    'https://api-sandbox.asaas.com/v3',
  )
})

test('normalizeAsaasBaseUrl falls back to default sandbox url', () => {
  assert.equal(normalizeAsaasBaseUrl(''), DEFAULT_ASAAS_BASE_URL)
})

test('normalizeAsaasEnvironment supports sandbox and production', () => {
  assert.equal(normalizeAsaasEnvironment('sandbox'), 'sandbox')
  assert.equal(normalizeAsaasEnvironment('PRODUCTION'), 'production')
  assert.equal(normalizeAsaasEnvironment('other'), 'sandbox')
})

test('getAsaasBaseUrl maps sandbox and production', () => {
  assert.equal(getAsaasBaseUrl('sandbox'), 'https://api-sandbox.asaas.com/v3')
  assert.equal(getAsaasBaseUrl('production'), 'https://api.asaas.com/v3')
})

test('detectAsaasEnvironmentFromBaseUrl infers production and sandbox', () => {
  assert.equal(detectAsaasEnvironmentFromBaseUrl('https://api.asaas.com/v3'), 'production')
  assert.equal(detectAsaasEnvironmentFromBaseUrl('https://sandbox.asaas.com/api/v3'), 'sandbox')
})

test('normalizeAsaasSecret trims empty values to null', () => {
  assert.equal(normalizeAsaasSecret('  abc  '), 'abc')
  assert.equal(normalizeAsaasSecret('   '), null)
  assert.equal(normalizeAsaasSecret(null), null)
})
