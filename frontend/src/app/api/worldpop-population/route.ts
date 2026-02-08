import { NextResponse } from 'next/server';

type Body = {
  dataset?: string;     // e.g. "wpgppop"
  year?: number;        // e.g. 2020
  geojson: any;         // Feature or FeatureCollection
  runasync?: boolean;   // default false
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body?.geojson) {
    return NextResponse.json({ error: 'Missing geojson' }, { status: 400 });
  }

  const dataset = body.dataset ?? 'wpgppop';
  const year = body.year ?? 2020;
  const runasync = body.runasync ?? false;

  // Optional key (server-side only)
  const key = process.env.WORLDPOP_API_KEY;

  // WorldPop stats endpoint takes geojson as a query param
  const params = new URLSearchParams({
    dataset,
    year: String(year),
    geojson: JSON.stringify(body.geojson),
    runasync: String(runasync),
  });

  if (key) params.set('key', key);

  const statsUrl = `https://api.worldpop.org/v1/services/stats?${params.toString()}`;

  let statsResp: Response;
  try {
    statsResp = await fetch(statsUrl, { method: 'GET' });
  } catch (e: any) {
    return NextResponse.json(
      { error: `Failed to reach WorldPop: ${String(e?.message ?? e)}` },
      { status: 502 }
    );
  }

  let statsJson: any;
  try {
    statsJson = await statsResp.json();
  } catch {
    const txt = await statsResp.text().catch(() => '');
    return NextResponse.json(
      { error: 'WorldPop returned non-JSON response', raw_text: txt.slice(0, 500) },
      { status: 502 }
    );
  }

  // Synchronous response
  const finishedPop = statsJson?.data?.total_population;
  if (statsJson?.status === 'finished' && typeof finishedPop === 'number') {
    return NextResponse.json({ total_population: finishedPop, raw: statsJson });
  }

  // Async response: poll task
  const taskid = statsJson?.taskid;
  if (!taskid) {
    const msg = statsJson?.error_message || statsJson?.message || 'WorldPop did not return taskid';
    return NextResponse.json({ error: msg, raw: statsJson }, { status: 502 });
  }

  const taskUrl = `https://api.worldpop.org/v1/tasks/${taskid}`;

  // Poll ~12 seconds (12 x 1s)
  for (let i = 0; i < 12; i++) {
    await sleep(1000);

    let taskResp: Response;
    try {
      taskResp = await fetch(taskUrl, { method: 'GET' });
    } catch (e: any) {
      return NextResponse.json(
        { error: `Failed polling WorldPop task: ${String(e?.message ?? e)}` },
        { status: 502 }
      );
    }

    let taskJson: any;
    try {
      taskJson = await taskResp.json();
    } catch {
      continue;
    }

    const pop = taskJson?.data?.total_population;
    if (taskJson?.status === 'finished' && typeof pop === 'number') {
      return NextResponse.json({ total_population: pop, raw: taskJson });
    }

    if (taskJson?.status === 'error' || taskJson?.error) {
      const msg = taskJson?.error_message || taskJson?.message || 'WorldPop task error';
      return NextResponse.json({ error: msg, raw: taskJson }, { status: 502 });
    }
  }

  return NextResponse.json(
    { error: 'Timed out waiting for WorldPop task to finish', taskid },
    { status: 504 }
  );
}