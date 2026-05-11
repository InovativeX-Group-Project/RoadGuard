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
  Crack: {
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
  Other: {
    severity: 'Low',
    urgency: 'Routine',
    estimatedTime: '10–21 business days',
    estimatedCostZAR: 'R 1 000 – R 10 000',
    recommendedAction:
      'A site inspection by a municipal roads engineer is recommended to accurately classify the defect and prescribe the appropriate repair method.',
    fullDescriptionTemplate: (labels) => {
      const topLabel = labels[0]?.name || 'unclassified road condition';
      return (
        `The image shows a road infrastructure issue that does not clearly fall into standard damage categories. ` +
        `AI analysis identified the following in the scene: ${labels.slice(0, 3).map(l => l.name).join(', ')} (top detection: ${topLabel}). ` +
        `This may include debris on the road, missing road markings, damaged guardrails, flooding, or other hazards. ` +
        `A qualified municipal inspector should visit the site to assess the exact nature of the problem and determine the correct repair or maintenance response.`
      );
    },
  },
};

const DISCLAIMER =
  'Note: Cost and time estimates are indicative only, based on typical South African municipal road repair rates (2024–2025). ' +
  'Final figures depend on road classification, extent of damage, contractor rates, and material availability.';

// ─── Main entry point ───────────────────────────────────────────────────────
async function detectRoadDamage(base64Image) {
  try {
    const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

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

/**
 * Takes a raw parse result {issueType, rawLabels} and adds the full estimation fields.
 */
function enrichResult(raw) {
  const data = ISSUE_DATA[raw.issueType] || ISSUE_DATA['Other'];
  const labels = raw.rawLabels || [];

  const fullDescription = data.fullDescriptionTemplate(labels);

  return {
    issueType: raw.issueType,
    description: raw.description || fullDescription.split('.')[0] + '.',
    fullDescription,
    rawLabels: labels,
    severity: data.severity,
    urgency: data.urgency,
    estimatedTime: data.estimatedTime,
    estimatedCostZAR: data.estimatedCostZAR,
    recommendedAction: data.recommendedAction,
    disclaimer: DISCLAIMER,
  };
}

function buildFallback() {
  const data = ISSUE_DATA['Other'];
  return {
    issueType: 'Other',
    description: 'Image uploaded. Please select the issue type and add details manually.',
    fullDescription:
      'The image has been uploaded successfully, but automated analysis was unavailable at this time. ' +
      'Please describe the road damage manually and select the most appropriate issue category. ' +
      'A municipal inspector will be dispatched to assess the reported location.',
    rawLabels: [],
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
  if (/pothole|hole|asphalt damage|road damage|pavement damage/.test(joined)) return 'Pothole';
  if (/crack|fracture|fissure|break|spall/.test(joined)) return 'Crack';
  if (/traffic light|traffic signal|semaphore|signal head|intersection signal/.test(joined)) return 'Broken Traffic Light';
  return 'Other';
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

module.exports = { detectRoadDamage };
