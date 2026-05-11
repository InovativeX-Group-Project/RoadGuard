/**
 * RoadGuard AI Service
 * Analyses road damage images and produces:
 *  - issueType         : classified damage category
 *  - fullDescription   : human-readable paragraph describing the problem
 *  - description       : short summary (kept for backward compat)
 *  - rawLabels         : [{name, confidence, isObject?}]
 *  - severity          : 'Low' | 'Medium' | 'High' | 'Critical'
 *  - urgency           : 'Routine' | 'Moderate' | 'Urgent' | 'Emergency'
 *  - estimatedTime     : e.g. "3–7 business days"
 *  - estimatedCostZAR  : e.g. "R 2 500 – R 15 000"
 *  - recommendedAction : what the municipality should do
 *  - disclaimer        : cost/time caveat
 */

// ─── Estimation data per issue type ────────────────────────────────────────
const buildStandardIssueData = ({
  condition,
  risk,
  severity = 'Medium',
  urgency = 'Moderate',
  estimatedTime = '3-10 business days',
  estimatedCostZAR = 'R 2 000 - R 25 000',
  recommendedAction,
}) => ({
  severity,
  urgency,
  estimatedTime,
  estimatedCostZAR,
  recommendedAction,
  fullDescriptionTemplate: () =>
    `A municipal road infrastructure defect has been identified from the submitted image. ${condition} ${risk} ${recommendedAction}`,
});

const ISSUE_DATA = {
  Pothole: {
    severity: 'High',
    urgency: 'Urgent',
    estimatedTime: '3–7 business days',
    estimatedCostZAR: 'R 2 500 – R 15 000',
    recommendedAction:
      'Dispatch a road maintenance crew to assess the depth and diameter of the pothole. Temporary cold-mix patching should be applied immediately to prevent vehicle damage and accidents. Schedule permanent hot-mix asphalt repair within the repair window.',
    fullDescriptionTemplate: (labels) => {
      const topLabel = labels[0]?.name || 'road damage';
      return (
        `The uploaded image shows clear evidence of a pothole on a public road surface. ` +
        `AI image analysis identified road surface degradation with high confidence (top detection: ${topLabel}). ` +
        `Potholes form when water seeps beneath the asphalt, weakens the sub-base, and the surface collapses under traffic load. ` +
        `This type of damage poses an immediate risk to vehicle tyres, suspension systems, and can cause accidents — especially at night or in wet conditions. ` +
        `The affected section of road should be cordoned off or marked with warning signs until repairs are completed.`
      );
    },
  },
  'Cracked Road': {
    severity: 'Medium',
    urgency: 'Moderate',
    estimatedTime: '7–14 business days',
    estimatedCostZAR: 'R 3 000 – R 20 000',
    recommendedAction:
      'Schedule a road inspection to evaluate crack width and depth. Apply bitumen crack sealant or slurry seal to prevent water ingress and further deterioration. If alligator cracking is present, full-depth reclamation may be required.',
    fullDescriptionTemplate: (labels) => {
      const topLabel = labels[0]?.name || 'surface irregularity';
      return (
        `The image reveals surface cracking or fracturing on the road pavement. ` +
        `AI analysis detected structural stress patterns (top detection: ${topLabel}) consistent with fatigue cracking, thermal cracking, or shrinkage. ` +
        `Untreated cracks allow rainwater to penetrate the pavement layers, accelerating the formation of potholes and structural failure. ` +
        `This issue is currently in an early-to-mid deterioration stage and should be addressed before it escalates into more costly structural repairs. ` +
        `Crack sealing is a cost-effective intervention that significantly extends pavement life.`
      );
    },
  },
  'Broken Traffic Light': {
    severity: 'Critical',
    urgency: 'Emergency',
    estimatedTime: '1–3 business days',
    estimatedCostZAR: 'R 15 000 – R 80 000',
    recommendedAction:
      'Immediately notify the traffic management authority. A traffic officer should be deployed to the intersection to manage flow. The electrical fault must be diagnosed by a certified traffic-signal technician, and components replaced or reprogrammed.',
    fullDescriptionTemplate: (labels) => {
      const topLabel = labels[0]?.name || 'traffic infrastructure';
      return (
        `The image indicates a malfunctioning or non-operational traffic signal at a road intersection. ` +
        `AI analysis detected traffic infrastructure elements (top detection: ${topLabel}) in a state of failure. ` +
        `A broken traffic light creates an uncontrolled intersection, significantly increasing the risk of collisions, pedestrian accidents, and traffic congestion. ` +
        `This is classified as a road safety emergency requiring immediate response from the City's Traffic Engineering Department. ` +
        `Until the signal is restored, temporary traffic management measures (e.g., deploying a traffic officer or installing stop signs) are strongly recommended.`
      );
    },
  },
  'Broken Street Light': buildStandardIssueData({
    condition: 'Visual indicators suggest a non-functional or damaged street lighting unit along the roadway.',
    risk: 'Reduced night-time visibility increases collision, pedestrian, and security risk in the affected area.',
    severity: 'High',
    urgency: 'Urgent',
    estimatedTime: '1-5 business days',
    estimatedCostZAR: 'R 4 000 - R 35 000',
    recommendedAction:
      'The municipality should dispatch electrical maintenance personnel to isolate faults, replace failed components, and restore safe illumination levels.',
  }),
  'Faded Road Markings': buildStandardIssueData({
    condition: 'Road marking visibility appears degraded and may be below operational standards.',
    risk: 'Poor markings reduce lane guidance and increase turning, merging, and pedestrian-conflict incidents.',
    estimatedTime: '5-14 business days',
    estimatedCostZAR: 'R 3 000 - R 30 000',
    recommendedAction:
      'A road marking audit and repainting program with compliant reflective materials should be scheduled for the affected corridor.',
  }),
  'Damaged Pavement/Sidewalk': buildStandardIssueData({
    condition: 'The pedestrian pavement/sidewalk surface appears damaged or structurally compromised.',
    risk: 'Defective walking surfaces increase trip-and-fall risk and reduce safe accessibility for residents.',
    severity: 'Medium',
    urgency: 'Moderate',
    estimatedTime: '4-12 business days',
    estimatedCostZAR: 'R 3 500 - R 40 000',
    recommendedAction:
      'Municipal civil works should repair slabs, edge failures, or settlement zones and restore compliant pedestrian access.',
  }),
  'Blocked Storm Drain': buildStandardIssueData({
    condition: 'Drainage inlets or stormwater pathways appear obstructed by debris or sediment.',
    risk: 'Blocked drainage can trigger localized flooding and accelerate pavement deterioration.',
    severity: 'High',
    urgency: 'Urgent',
    estimatedTime: '1-4 business days',
    estimatedCostZAR: 'R 2 000 - R 18 000',
    recommendedAction:
      'Stormwater maintenance teams should clear the obstruction, verify flow restoration, and inspect adjacent drainage lines.',
  }),
  'Water Leak on Road': buildStandardIssueData({
    condition: 'There are signs of uncontrolled water discharge onto the road surface.',
    risk: 'Persistent water flow weakens pavement layers, increases skid risk, and may indicate utility infrastructure failure.',
    severity: 'High',
    urgency: 'Urgent',
    estimatedTime: '1-6 business days',
    estimatedCostZAR: 'R 5 000 - R 60 000',
    recommendedAction:
      'Coordinate with water utility services to isolate the source leak, perform repairs, and assess resulting road-base damage.',
  }),
  Sinkhole: buildStandardIssueData({
    condition: 'A possible sinkhole or severe sub-surface collapse zone is visible.',
    risk: 'Sinkholes present critical structural failure risk with immediate danger to vehicles, pedestrians, and nearby utilities.',
    severity: 'Critical',
    urgency: 'Emergency',
    estimatedTime: '1-10 business days',
    estimatedCostZAR: 'R 25 000 - R 500 000',
    recommendedAction:
      'Emergency cordon controls, geotechnical assessment, and urgent structural stabilization should be initiated immediately.',
  }),
  'Loose Gravel': buildStandardIssueData({
    condition: 'Loose aggregate is present on the road surface.',
    risk: 'Loose gravel can reduce traction, increase braking distance, and cause vehicle instability, especially for two-wheel users.',
    estimatedTime: '1-5 business days',
    estimatedCostZAR: 'R 1 500 - R 12 000',
    recommendedAction:
      'Road maintenance teams should clear loose material and restore surface integrity where aggregate loss is recurrent.',
  }),
  'Fallen Road Sign': buildStandardIssueData({
    condition: 'Traffic signage appears fallen, displaced, or no longer visibly serviceable.',
    risk: 'Missing sign guidance can cause navigation errors, right-of-way conflicts, and safety incidents.',
    severity: 'High',
    urgency: 'Urgent',
    estimatedTime: '1-4 business days',
    estimatedCostZAR: 'R 2 500 - R 20 000',
    recommendedAction:
      'The municipality should reinstall or replace affected signage and verify mounting stability and visibility compliance.',
  }),
  'Damaged Guardrail': buildStandardIssueData({
    condition: 'Roadside guardrail infrastructure appears damaged or deformed.',
    risk: 'Compromised barriers reduce containment protection and elevate crash severity on high-risk segments.',
    severity: 'High',
    urgency: 'Urgent',
    estimatedTime: '2-10 business days',
    estimatedCostZAR: 'R 8 000 - R 90 000',
    recommendedAction:
      'A safety inspection and barrier repair or replacement program should be completed to restore crash-protection performance.',
  }),
  'Uneven Road Surface': buildStandardIssueData({
    condition: 'The carriageway shows unevenness, settlement, or abrupt level variation.',
    risk: 'Surface irregularities can damage vehicles, reduce ride stability, and increase accident probability at speed.',
    estimatedTime: '3-12 business days',
    estimatedCostZAR: 'R 4 000 - R 55 000',
    recommendedAction:
      'Municipal roads teams should measure profile deviations and complete leveling, patching, or localized reconstruction as required.',
  }),
  'Flooded Road': buildStandardIssueData({
    condition: 'The roadway appears inundated or partially submerged by standing water.',
    risk: 'Flooded roads can conceal hazards, disable vehicles, and create immediate safety and mobility disruptions.',
    severity: 'Critical',
    urgency: 'Emergency',
    estimatedTime: 'Immediate to 5 business days',
    estimatedCostZAR: 'R 5 000 - R 120 000',
    recommendedAction:
      'Immediate traffic control, drainage intervention, and post-flood pavement assessment should be executed without delay.',
  }),
  'Illegal Dumping': buildStandardIssueData({
    condition: 'Waste material appears to have been unlawfully dumped within the road reserve.',
    risk: 'Illegal dumping obstructs visibility and drainage, creates environmental hazards, and degrades public safety.',
    estimatedTime: '2-7 business days',
    estimatedCostZAR: 'R 2 500 - R 35 000',
    recommendedAction:
      'Environmental and roads teams should remove dumped material, sanitize the area, and trigger enforcement follow-up.',
  }),
  'Overgrown Bushes': buildStandardIssueData({
    condition: 'Roadside vegetation appears overgrown and may obstruct line-of-sight visibility.',
    risk: 'Blocked visibility affects intersection safety, pedestrian awareness, and sign recognition.',
    estimatedTime: '2-7 business days',
    estimatedCostZAR: 'R 1 500 - R 15 000',
    recommendedAction:
      'Vegetation management crews should trim obstructive growth and maintain required sight-distance clearances.',
  }),
  'Missing Manhole Cover': buildStandardIssueData({
    condition: 'A manhole or utility opening appears exposed due to a missing or displaced cover.',
    risk: 'Open utility chambers present severe risk to vehicles, cyclists, and pedestrians and require immediate hazard control.',
    severity: 'Critical',
    urgency: 'Emergency',
    estimatedTime: 'Immediate to 2 business days',
    estimatedCostZAR: 'R 3 000 - R 30 000',
    recommendedAction:
      'The area should be barricaded immediately and the appropriate cover reinstated by utility maintenance personnel.',
  }),
  'Broken Speed Hump': buildStandardIssueData({
    condition: 'Traffic calming infrastructure appears cracked, eroded, or partially failed.',
    risk: 'Defective speed humps reduce speed-control effectiveness and may create abrupt vehicle impact hazards.',
    estimatedTime: '3-10 business days',
    estimatedCostZAR: 'R 4 000 - R 45 000',
    recommendedAction:
      'Road maintenance teams should reconstruct or repair the speed hump geometry to restore safe traffic-calming function.',
  }),
  'Oil Spill': buildStandardIssueData({
    condition: 'Surface staining and sheen are consistent with an oil or hydrocarbon spill event.',
    risk: 'Oil contamination reduces tyre grip and can cause severe skidding incidents, especially during rain.',
    severity: 'High',
    urgency: 'Urgent',
    estimatedTime: 'Immediate to 2 business days',
    estimatedCostZAR: 'R 2 000 - R 25 000',
    recommendedAction:
      'Hazmat-compatible absorbent treatment and roadway cleaning should be deployed immediately, followed by source investigation.',
  }),
  'Exposed Electrical Cables': buildStandardIssueData({
    condition: 'Electrical cabling or conductive infrastructure appears exposed within a public road area.',
    risk: 'This presents serious electrocution and fire hazards and requires urgent technical isolation.',
    severity: 'Critical',
    urgency: 'Emergency',
    estimatedTime: 'Immediate to 2 business days',
    estimatedCostZAR: 'R 5 000 - R 70 000',
    recommendedAction:
      'Isolate the hazard perimeter immediately and dispatch certified electrical teams for emergency remediation.',
  }),
  Other: {
    severity: 'Low',
    urgency: 'Routine',
    estimatedTime: '10–21 business days',
    estimatedCostZAR: 'R 1 000 – R 10 000',
    recommendedAction:
      'A site inspection by a municipal roads engineer is recommended to accurately classify the defect and prescribe the appropriate repair method.',
    fullDescriptionTemplate: (labels) => {
      const profile = getOtherIssueProfile(labels);
      return (
        `A road condition requiring municipal attention has been identified from the submitted image. ` +
        `${profile.conditionText} ` +
        `${profile.riskText} ` +
        `${profile.actionText}`
      );
    },
  },
};

const VALID_ISSUE_TYPES = Object.keys(ISSUE_DATA);

const ISSUE_GROUPS = {
  Pothole: 'Road surface damage',
  'Cracked Road': 'Road surface damage',
  Sinkhole: 'Road surface damage',
  'Uneven Road Surface': 'Road surface damage',
  'Loose Gravel': 'Road surface damage',
  'Broken Speed Hump': 'Road surface damage',
  'Damaged Pavement/Sidewalk': 'Road surface damage',

  'Broken Street Light': 'Traffic infrastructure damage',
  'Broken Traffic Light': 'Traffic infrastructure damage',
  'Faded Road Markings': 'Traffic infrastructure damage',
  'Fallen Road Sign': 'Traffic infrastructure damage',
  'Damaged Guardrail': 'Traffic infrastructure damage',

  'Blocked Storm Drain': 'Safety hazards',
  'Water Leak on Road': 'Safety hazards',
  'Flooded Road': 'Safety hazards',
  'Illegal Dumping': 'Safety hazards',
  'Overgrown Bushes': 'Safety hazards',
  'Missing Manhole Cover': 'Safety hazards',
  'Oil Spill': 'Safety hazards',
  'Exposed Electrical Cables': 'Safety hazards',
  Other: 'Safety hazards',
};

function getIssueGroup(issueType) {
  return ISSUE_GROUPS[issueType] || 'Safety hazards';
}

function normalizeIssueType(value) {
  const raw = String(value || '').trim();
  if (!raw) return 'Other';

  const exact = VALID_ISSUE_TYPES.find((t) => t.toLowerCase() === raw.toLowerCase());
  if (exact) return exact;

  const inferred = classifyIssue([raw]);
  return inferred || 'Other';
}

const DISCLAIMER =
  'Note: Cost and time estimates are indicative only, based on typical South African municipal road repair rates (2024–2025). ' +
  'Final figures depend on road classification, extent of damage, contractor rates, and material availability.';

// ─── Main entry point ───────────────────────────────────────────────────────
async function detectRoadDamage(base64Image, context = {}) {
  try {
    const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

    if (process.env.OPENAI_API_KEY) {
      const openAIResult = await tryOpenAIVision(base64Image, context);
      if (openAIResult) return enrichResult(openAIResult);
    }

    if (process.env.IMAGGA_API_KEY && process.env.IMAGGA_API_SECRET) {
      const imaggaResult = await tryImagga(base64Data);
      if (imaggaResult) return enrichResult(imaggaResult);
    }

    if (process.env.GOOGLE_CLOUD_API_KEY) {
      const visionResult = await tryGoogleVisionREST(base64Data);
      if (visionResult) return enrichResult(visionResult);
    }

    const clarifaiResult = await tryClarifai(base64Data);
    if (clarifaiResult) return enrichResult(clarifaiResult);

    console.log('All APIs unavailable – using fallback');
    return buildFallback();
  } catch (error) {
    console.error('Detection error:', error);
    return buildFallback();
  }
}

async function generateDescriptionFromContext({ issueType, location }) {
  const normalizedIssueType = normalizeIssueType(issueType);
  const locationText = (location || 'the reported location').trim();

  if (process.env.OPENAI_API_KEY) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.2,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: 'You draft formal municipal road incident reports. Output strict JSON only.',
            },
            {
              role: 'user',
              content: [
                `Issue type: ${normalizedIssueType}.`,
                `Location: ${locationText}.`,
                'Write a concise, direct formal report paragraph for municipality officials.',
                'Must clearly name the issue type and location, impact on public safety, and requested municipal action.',
                'Return JSON with keys: fullDescription, shortSummary, recommendedAction.',
              ].join(' '),
            },
          ],
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const content = result?.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          return enrichResult({
            issueType: normalizedIssueType,
            description: parsed.shortSummary || `Identified issue type: ${normalizedIssueType}.`,
            fullDescription: parsed.fullDescription,
            recommendedAction: parsed.recommendedAction,
            rawLabels: [],
            source: 'openai',
          });
        }
      }
    } catch (error) {
      console.log('OpenAI context description error:', error.message);
    }
  }

  const data = ISSUE_DATA[normalizedIssueType] || ISSUE_DATA.Other;
  return enrichResult({
    issueType: normalizedIssueType,
    description: `Identified issue type: ${normalizedIssueType}.`,
    fullDescription:
      `A ${normalizedIssueType} has been reported at ${locationText}. ` +
      `This condition requires municipal attention due to potential public safety and traffic-flow impacts. ` +
      `${data.recommendedAction}`,
    recommendedAction: data.recommendedAction,
    rawLabels: [],
    source: 'fallback',
  });
}

/**
 * Takes a raw parse result {issueType, rawLabels} and adds the full estimation fields.
 */
function enrichResult(raw) {
  const data = ISSUE_DATA[raw.issueType] || ISSUE_DATA['Other'];
  const labels = raw.rawLabels || [];
  const otherProfile = raw.issueType === 'Other' ? getOtherIssueProfile(labels) : null;
  let resolvedIssueType = otherProfile?.probableType || raw.issueType;

  if (resolvedIssueType === 'Other') {
    const shouldInferFromRules = raw.source !== 'openai';
    if (shouldInferFromRules) {
      const evidenceText = [
        raw.description || '',
        labels.map((l) => l.name).join(' '),
      ].join(' ').trim();

      const inferredFromEvidence = evidenceText ? classifyIssue([evidenceText]) : 'Other';
      resolvedIssueType = inferredFromEvidence !== 'Other' ? inferredFromEvidence : 'Other';
    }
  }

  const resolvedIssueData = ISSUE_DATA[resolvedIssueType] || data;

  const aiFullDescription = typeof raw.fullDescription === 'string' ? raw.fullDescription.trim() : '';
  const baseDescription = resolvedIssueData.fullDescriptionTemplate(labels);
  const fullDescription = aiFullDescription || `Identified Issue Type: ${resolvedIssueType}. ${baseDescription}`;

  return {
    issueType: resolvedIssueType,
    description: raw.description || `Identified issue type: ${resolvedIssueType}.`,
    fullDescription,
    rawLabels: labels,
    issueGroup: getIssueGroup(resolvedIssueType),
    severity: otherProfile?.severity || resolvedIssueData.severity,
    urgency: otherProfile?.urgency || resolvedIssueData.urgency,
    estimatedTime: otherProfile?.estimatedTime || resolvedIssueData.estimatedTime,
    estimatedCostZAR: otherProfile?.estimatedCostZAR || resolvedIssueData.estimatedCostZAR,
    recommendedAction: raw.recommendedAction || otherProfile?.recommendedAction || resolvedIssueData.recommendedAction,
    disclaimer: DISCLAIMER,
  };
}

function getOtherIssueProfile(labels) {
  const joined = (labels || []).map(l => String(l.name || '').toLowerCase()).join(' ');

  if (/traffic light|traffic signal|signal head|intersection signal|stop light|red light|green light/.test(joined)) {
    return {
      probableType: 'Broken Traffic Light',
      conditionText:
        'Visual indicators suggest a malfunctioning traffic signal installation at or near an intersection.',
      riskText:
        'Signal malfunction can create uncontrolled vehicle movement and increase collision risk for motorists and pedestrians.',
      actionText:
        'The municipality should dispatch traffic signal technicians immediately and apply temporary traffic control measures pending repair.',
      severity: 'Critical',
      urgency: 'Emergency',
      estimatedTime: '1-3 business days',
      estimatedCostZAR: 'R 15 000 - R 80 000',
      recommendedAction:
        'Immediately deploy traffic control and restore traffic signal functionality through qualified electrical technicians.',
    };
  }

  if (/street light|streetlight|lamp|lamp post|lamppost|light pole|lighting pole|street lighting/.test(joined)) {
    return {
      probableType: 'Broken Street Light',
      conditionText:
        'Visual indicators suggest a non-functional or damaged street lighting unit.',
      riskText:
        'Insufficient public lighting reduces night-time visibility and raises safety and security concerns in the affected area.',
      actionText:
        'The municipality should inspect and repair the street lighting installation at the earliest opportunity.',
      severity: 'High',
      urgency: 'Urgent',
      estimatedTime: '1-5 business days',
      estimatedCostZAR: 'R 4 000 - R 35 000',
      recommendedAction:
        'Dispatch municipal electrical maintenance teams to diagnose and repair the street light fault.',
    };
  }

  if (/puddle|water|flood|standing water|wet|reflection|rainwater/.test(joined)) {
    return {
      probableType: 'Flooded Road',
      conditionText:
        'Visual indicators are consistent with standing water accumulation on or adjacent to the carriageway.',
      riskText:
        'This condition can reduce tyre traction, increase braking distance, obscure underlying surface defects, and elevate collision risk during wet conditions.',
      actionText:
        'The municipality should inspect drainage capacity, clear blocked stormwater inlets, and implement short-term hazard control until permanent drainage corrections are completed.',
      severity: 'Medium',
      urgency: 'Moderate',
      estimatedTime: '2–10 business days',
      estimatedCostZAR: 'R 2 000 – R 25 000',
      recommendedAction:
        'Inspect and clear drainage infrastructure, remove water pooling hazards, and assess pavement integrity after water recedes.',
    };
  }

  if (/debris|rubble|trash|stone|rock|branch|obstruction/.test(joined)) {
    return {
      probableType: 'Illegal Dumping',
      conditionText:
        'Visual evidence suggests debris or obstruction within the road reserve that may interfere with normal traffic flow.',
      riskText:
        'Road obstructions can cause sudden braking, lane deviation, and potential vehicle or pedestrian incidents.',
      actionText:
        'The municipality should dispatch a maintenance response team to remove obstructions and secure the affected section of road as needed.',
      severity: 'Medium',
      urgency: 'Moderate',
      estimatedTime: '1–5 business days',
      estimatedCostZAR: 'R 1 500 – R 12 000',
      recommendedAction:
        'Remove debris promptly, deploy warning signage if required, and inspect for secondary infrastructure damage.',
    };
  }

  if (/road marking|lane|line|paint|crosswalk|marking/.test(joined)) {
    return {
      probableType: 'Faded Road Markings',
      conditionText:
        'The scene indicates possible deterioration or reduced visibility of essential road markings.',
      riskText:
        'Poor lane or crossing visibility can reduce driver guidance and increase side-swipe and pedestrian-conflict risk, particularly at night or in rain.',
      actionText:
        'The municipality should verify marking compliance and schedule remarking works for the affected corridor.',
      severity: 'Medium',
      urgency: 'Moderate',
      estimatedTime: '5–14 business days',
      estimatedCostZAR: 'R 3 000 – R 30 000',
      recommendedAction:
        'Conduct a marking visibility audit and complete repainting with compliant reflective materials.',
    };
  }

  return {
    probableType: null,
    conditionText:
      'The image reflects a non-standard road infrastructure concern requiring field verification and formal defect classification.',
    riskText:
      'While the exact defect type cannot be conclusively confirmed from imagery alone, unresolved road anomalies may degrade safety and serviceability over time.',
    actionText:
      'The municipality should assign an inspector to complete an on-site technical assessment and issue a corrective maintenance order.',
    severity: 'Low',
    urgency: 'Routine',
    estimatedTime: '10–21 business days',
    estimatedCostZAR: 'R 1 000 – R 10 000',
    recommendedAction:
      'Undertake site inspection, classify the defect, and schedule corrective maintenance according to municipal standards.',
  };
}

function buildFallback() {
  const fallbackType = 'Other';
  const data = ISSUE_DATA[fallbackType];
  return {
    issueType: fallbackType,
    description: `Identified issue type: ${fallbackType}. Preliminary municipal incident summary generated from uploaded image. Manual verification recommended.`,
    fullDescription:
      `Identified Issue Type: ${fallbackType}. A road infrastructure concern is visible in the uploaded image. Although automated classification services were temporarily unavailable, the report has been prepared as a formal municipal incident record for field verification. ` +
      'The municipality should assign an inspector to confirm the defect category, measure safety risk to vehicles and pedestrians, and schedule corrective maintenance based on on-site findings. ' +
      'This submission should be treated as an actionable maintenance notification pending final technical assessment.',
    rawLabels: [],
    issueGroup: getIssueGroup(fallbackType),
    severity: 'Low',
    urgency: 'Routine',
    estimatedTime: data.estimatedTime,
    estimatedCostZAR: data.estimatedCostZAR,
    recommendedAction: data.recommendedAction,
    disclaimer: DISCLAIMER,
  };
}

// ─── Classifier helper ──────────────────────────────────────────────────────
function classifyIssue(labelNames) {
  const joined = labelNames.join(' ').toLowerCase();
  if (/exposed cable|electrical cable|live wire|power cable|electric wire/.test(joined)) return 'Exposed Electrical Cables';
  if (/missing manhole|open manhole|manhole cover/.test(joined)) return 'Missing Manhole Cover';
  if (/sinkhole|ground collapse|subsidence/.test(joined)) return 'Sinkhole';
  if (/flood|flooded road|inundation|deep water/.test(joined)) return 'Flooded Road';
  if (/oil spill|diesel spill|fuel spill|hydrocarbon/.test(joined)) return 'Oil Spill';
  if (/water leak|pipe leak|burst pipe|water on road/.test(joined)) return 'Water Leak on Road';
  if (/blocked drain|storm drain|stormwater|drainage blockage|clogged drain/.test(joined)) return 'Blocked Storm Drain';
  if (/broken traffic light|traffic signal|signal head|intersection signal|stop light|red light|green light/.test(joined)) return 'Broken Traffic Light';
  if (/broken street light|street light|streetlight|street light damage|streetlight damage|lamp post|lamppost|streetlamp|light pole|lighting pole|street lighting/.test(joined)) return 'Broken Street Light';
  if (/faded road marking|road marking|lane marking|crosswalk|zebra crossing|road paint/.test(joined)) return 'Faded Road Markings';
  if (/broken speed hump|speed bump|traffic calming hump/.test(joined)) return 'Broken Speed Hump';
  if (/fallen road sign|road sign down|traffic sign damage|signpost/.test(joined)) return 'Fallen Road Sign';
  if (/guardrail|crash barrier|road barrier/.test(joined)) return 'Damaged Guardrail';
  if (/sidewalk|pavement slab|pedestrian pavement|footpath/.test(joined)) return 'Damaged Pavement/Sidewalk';
  if (/illegal dumping|dumped waste|garbage pile|refuse dump|rubbish/.test(joined)) return 'Illegal Dumping';
  if (/overgrown bush|vegetation overgrowth|visibility blocked|tree branch/.test(joined)) return 'Overgrown Bushes';
  if (/loose gravel|gravel road|stones on road|loose stone/.test(joined)) return 'Loose Gravel';
  if (/uneven road|surface settlement|road deformation|road hump|road dip/.test(joined)) return 'Uneven Road Surface';
  if (/crack|cracked|fracture|fissure|spall|surface split|alligator cracking/.test(joined)) return 'Cracked Road';
  if (/pothole|hole|asphalt damage|road damage|pavement damage/.test(joined)) return 'Pothole';
  return 'Other';
}

async function tryOpenAIVision(imageData, context = {}) {
  try {
    console.log('Trying OpenAI Vision API...');

    const allowedTypesText = VALID_ISSUE_TYPES.join(', ');
    const locationHint = context.location ? `Location provided by user: ${context.location}.` : 'Location was not provided by user.';
    const prompt = [
      'Analyze this road/street image and classify the primary municipal issue.',
      `Return ONLY JSON with keys: issueType, confidence, visibleEvidence, shortSummary, fullDescription, recommendedAction.`,
      `issueType must be one of: ${allowedTypesText}.`,
      'visibleEvidence must be an array of short labels seen in the image.',
      'If uncertain, choose the most probable issue type from the allowed list (do not use free text).',
      'fullDescription must be a direct, formal municipal report paragraph that clearly states the exact issue type and impacts, without placeholders.',
      locationHint,
    ].join(' ');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'You are a municipal road damage classifier. Output strict JSON only.',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageData } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      console.log('OpenAI Vision HTTP error:', response.status);
      return null;
    }

    const result = await response.json();
    const content = result?.choices?.[0]?.message?.content;
    if (!content) return null;

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      return null;
    }

    const issueType = normalizeIssueType(parsed.issueType);
    const confidence = Math.max(0, Math.min(100, Number(parsed.confidence) || 70));
    const visibleEvidence = Array.isArray(parsed.visibleEvidence)
      ? parsed.visibleEvidence.slice(0, 8).map((v) => String(v))
      : [];

    const rawLabels = visibleEvidence.map((name) => ({
      name,
      confidence,
    }));

    return {
      issueType,
      description: parsed.shortSummary || `Detected issue type: ${issueType}.`,
      fullDescription: parsed.fullDescription,
      recommendedAction: parsed.recommendedAction,
      source: 'openai',
      rawLabels,
    };
  } catch (error) {
    console.log('OpenAI Vision error:', error.message);
    return null;
  }
}

// ─── API parsers ─────────────────────────────────────────────────────────────
async function tryImagga(base64Data) {
  try {
    console.log('Trying Imagga API...');
    const auth = Buffer.from(`${process.env.IMAGGA_API_KEY}:${process.env.IMAGGA_API_SECRET}`).toString('base64');
    const response = await fetch('https://api.imagga.com/v2/tags', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `image_base64=${base64Data}`,
    });

    if (!response.ok) { console.log('Imagga HTTP error:', response.status); return null; }

    const result = await response.json();
    if (!result.result?.tags?.length) return null;

    const rawLabels = result.result.tags.slice(0, 8).map(t => ({
      name: t.tag.en,
      confidence: Math.round(t.confidence || 0),
    }));
    const issueType = classifyIssue(rawLabels.map(l => l.name));
    const descLines = rawLabels.slice(0, 5).map(l => `${l.name} (${l.confidence}%)`).join(', ');

    return { issueType, description: `Detected: ${descLines}.`, rawLabels };
  } catch (error) {
    console.log('Imagga error:', error.message);
    return null;
  }
}

async function tryGoogleVisionREST(base64Data) {
  try {
    console.log('Trying Google Cloud Vision REST API...');
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_CLOUD_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: base64Data },
            features: [
              { type: 'LABEL_DETECTION', maxResults: 10 },
              { type: 'OBJECT_LOCALIZATION', maxResults: 5 },
            ],
          }],
        }),
      }
    );

    if (!response.ok) { console.log('Google Cloud Vision HTTP error:', response.status); return null; }

    const result = await response.json();
    console.log('Google Cloud Vision success:', result);
    const r0 = result.responses?.[0];
    if (!r0?.labelAnnotations) return null;

    const rawLabels = r0.labelAnnotations.map(l => ({
      name: l.description,
      confidence: Math.round((l.score || 0) * 100),
    }));

    // Merge object localizations
    if (r0.localizedObjectAnnotations?.length) {
      r0.localizedObjectAnnotations.forEach(obj => {
        if (!rawLabels.find(l => l.name.toLowerCase() === obj.name.toLowerCase())) {
          rawLabels.push({ name: obj.name, confidence: Math.round((obj.score || 0) * 100), isObject: true });
        }
      });
    }

    const issueType = classifyIssue(rawLabels.map(l => l.name));
    const descLines = rawLabels.slice(0, 5).map(l => `${l.name} (${l.confidence}%)`).join(', ');

    return { issueType, description: `Detected: ${descLines}.`, rawLabels };
  } catch (error) {
    console.log('Google Cloud Vision error:', error.message);
    return null;
  }
}

async function tryClarifai(base64Data) {
  try {
    console.log('Trying Clarifai API...');
    const response = await fetch('https://api.clarifai.com/v2/models/aaa03c23b3724a16a56b629203edc62c/outputs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: [{ data: { image: { base64: base64Data } } }] }),
    });

    if (!response.ok) { console.log('Clarifai HTTP error:', response.status); return null; }

    const result = await response.json();
    if (!result.outputs?.[0]?.data?.concepts) return null;

    const rawLabels = result.outputs[0].data.concepts.slice(0, 8).map(c => ({
      name: c.name,
      confidence: Math.round((c.value || 0) * 100),
    }));
    const issueType = classifyIssue(rawLabels.map(l => l.name));
    const descLines = rawLabels.slice(0, 5).map(l => `${l.name} (${l.confidence}%)`).join(', ');

    return { issueType, description: `Detected: ${descLines}.`, rawLabels };
  } catch (error) {
    console.log('Clarifai error:', error.message);
    return null;
  }
}

module.exports = { detectRoadDamage, generateDescriptionFromContext };
