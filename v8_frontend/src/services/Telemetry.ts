export interface TelemetryPayload {
  title: string;
  severity: 'low' | 'medium' | 'high';
  notes?: string;
  origin_tenant?: string;
  channels?: ('sms' | 'email' | 'voice')[];
  classification?: 'LIFE-SAFETY' | 'URGENT' | 'TEST' | 'INFO';
  alert_message?: string;
  target_label?: string;
  ics_position?: string;
  ics_resources?: string;
  operational_period_id?: string;
}

/**
 * Centrally manages outbound telemetry logs to the local Cascadia Matrix Flask Engine.
 * Formats data with strict NIMS alignment and logs transmissions with high-visibility EOC prefixes.
 */
export async function sendTelemetryLog(payload: TelemetryPayload): Promise<boolean> {
  const url = 'http://127.0.0.1:5001/api/logs';
  const tenant = payload.origin_tenant || 'CASCADIA_EM_ALERTS';
  
  console.log(`📥 [TELEMETRY DISPATCH]: Preparing telemetry log block for origin [${tenant}]`);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...payload,
        origin_tenant: tenant
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`🚨 [TELEMETRY FAILURE]: Server responded with status ${response.status}: ${errorText}`);
      return false;
    }

    const data = await response.json();
    console.log(`✅ [TELEMETRY SUCCESS]: Telemetry log successfully accepted. Status: ${data.status}`);
    return true;
  } catch (error: any) {
    console.error(`🚨 [TELEMETRY FAILURE]: Transmission error to ${url}: ${error?.message || error}`);
    return false;
  }
}
