import React from 'react'
import { render } from '@react-email/render'
import { BillingAutoUpgradeEmail } from './templates/BillingAutoUpgradeEmail'

export async function renderBillingAutoUpgradeEmail(props: {
  organizationName: string
  userEmail: string
  oldPlanName: string
  newPlanName: string
  upgradeDate: string
  nextChargeDate: string
  nextChargeAmount: string
}): Promise<string> {
  return render(React.createElement(BillingAutoUpgradeEmail, props))
}
