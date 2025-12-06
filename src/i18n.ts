import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import enCommon from './locales/en/common.json'
import enNavigation from './locales/en/navigation.json'
import enDashboard from './locales/en/dashboard.json'
import enMonitoring from './locales/en/monitoring.json'
import enVirtualMachines from './locales/en/virtualMachines.json'
import enClusters from './locales/en/clusters.json'
import enSettings from './locales/en/settings.json'
import enTemplates from './locales/en/templates.json'
import enVmCreate from './locales/en/vmCreate.json'
import enHubs from './locales/en/hubs.json'
import enOrganizations from './locales/en/organizations.json'
import enBareMetalHosts from './locales/en/bareMetalHosts.json'

import zhCommon from './locales/zh/common.json'
import zhNavigation from './locales/zh/navigation.json'
import zhDashboard from './locales/zh/dashboard.json'
import zhMonitoring from './locales/zh/monitoring.json'
import zhVirtualMachines from './locales/zh/virtualMachines.json'
import zhClusters from './locales/zh/clusters.json'
import zhSettings from './locales/zh/settings.json'
import zhTemplates from './locales/zh/templates.json'
import zhVmCreate from './locales/zh/vmCreate.json'
import zhHubs from './locales/zh/hubs.json'
import zhOrganizations from './locales/zh/organizations.json'
import zhBareMetalHosts from './locales/zh/bareMetalHosts.json'

import zhTWCommon from './locales/zh-TW/common.json'
import zhTWNavigation from './locales/zh-TW/navigation.json'
import zhTWDashboard from './locales/zh-TW/dashboard.json'
import zhTWMonitoring from './locales/zh-TW/monitoring.json'
import zhTWVirtualMachines from './locales/zh-TW/virtualMachines.json'
import zhTWClusters from './locales/zh-TW/clusters.json'
import zhTWSettings from './locales/zh-TW/settings.json'
import zhTWTemplates from './locales/zh-TW/templates.json'
import zhTWVmCreate from './locales/zh-TW/vmCreate.json'
import zhTWHubs from './locales/zh-TW/hubs.json'
import zhTWOrganizations from './locales/zh-TW/organizations.json'
import zhTWBareMetalHosts from './locales/zh-TW/bareMetalHosts.json'

import esCommon from './locales/es/common.json'
import esNavigation from './locales/es/navigation.json'
import esDashboard from './locales/es/dashboard.json'
import esMonitoring from './locales/es/monitoring.json'
import esVirtualMachines from './locales/es/virtualMachines.json'
import esClusters from './locales/es/clusters.json'
import esSettings from './locales/es/settings.json'
import esTemplates from './locales/es/templates.json'
import esVmCreate from './locales/es/vmCreate.json'
import esHubs from './locales/es/hubs.json'
import esOrganizations from './locales/es/organizations.json'
import esBareMetalHosts from './locales/es/bareMetalHosts.json'

import ptBRCommon from './locales/pt-BR/common.json'
import ptBRNavigation from './locales/pt-BR/navigation.json'
import ptBRDashboard from './locales/pt-BR/dashboard.json'
import ptBRMonitoring from './locales/pt-BR/monitoring.json'
import ptBRVirtualMachines from './locales/pt-BR/virtualMachines.json'
import ptBRClusters from './locales/pt-BR/clusters.json'
import ptBRSettings from './locales/pt-BR/settings.json'
import ptBRTemplates from './locales/pt-BR/templates.json'
import ptBRVmCreate from './locales/pt-BR/vmCreate.json'
import ptBRHubs from './locales/pt-BR/hubs.json'
import ptBROrganizations from './locales/pt-BR/organizations.json'
import ptBRBareMetalHosts from './locales/pt-BR/bareMetalHosts.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enCommon,
        navigation: enNavigation,
        dashboard: enDashboard,
        monitoring: enMonitoring,
        virtualMachines: enVirtualMachines,
        clusters: enClusters,
        settings: enSettings,
        templates: enTemplates,
        vmCreate: enVmCreate,
        hubs: enHubs,
        organizations: enOrganizations,
        bareMetalHosts: enBareMetalHosts,
      },
      zh: {
        common: zhCommon,
        navigation: zhNavigation,
        dashboard: zhDashboard,
        monitoring: zhMonitoring,
        virtualMachines: zhVirtualMachines,
        clusters: zhClusters,
        settings: zhSettings,
        templates: zhTemplates,
        vmCreate: zhVmCreate,
        hubs: zhHubs,
        organizations: zhOrganizations,
        bareMetalHosts: zhBareMetalHosts,
      },
      'zh-TW': {
        common: zhTWCommon,
        navigation: zhTWNavigation,
        dashboard: zhTWDashboard,
        monitoring: zhTWMonitoring,
        virtualMachines: zhTWVirtualMachines,
        clusters: zhTWClusters,
        settings: zhTWSettings,
        templates: zhTWTemplates,
        vmCreate: zhTWVmCreate,
        hubs: zhTWHubs,
        organizations: zhTWOrganizations,
        bareMetalHosts: zhTWBareMetalHosts,
      },
      es: {
        common: esCommon,
        navigation: esNavigation,
        dashboard: esDashboard,
        monitoring: esMonitoring,
        virtualMachines: esVirtualMachines,
        clusters: esClusters,
        settings: esSettings,
        templates: esTemplates,
        vmCreate: esVmCreate,
        hubs: esHubs,
        organizations: esOrganizations,
        bareMetalHosts: esBareMetalHosts,
      },
      'pt-BR': {
        common: ptBRCommon,
        navigation: ptBRNavigation,
        dashboard: ptBRDashboard,
        monitoring: ptBRMonitoring,
        virtualMachines: ptBRVirtualMachines,
        clusters: ptBRClusters,
        settings: ptBRSettings,
        templates: ptBRTemplates,
        vmCreate: ptBRVmCreate,
        hubs: ptBRHubs,
        organizations: ptBROrganizations,
        bareMetalHosts: ptBRBareMetalHosts,
      },
    },
    fallbackLng: 'en',
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'language',
    },
  })

export default i18n
