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

import zhCommon from './locales/zh/common.json'
import zhNavigation from './locales/zh/navigation.json'
import zhDashboard from './locales/zh/dashboard.json'
import zhMonitoring from './locales/zh/monitoring.json'
import zhVirtualMachines from './locales/zh/virtualMachines.json'
import zhClusters from './locales/zh/clusters.json'
import zhSettings from './locales/zh/settings.json'
import zhTemplates from './locales/zh/templates.json'

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
