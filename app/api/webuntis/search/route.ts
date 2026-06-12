import { NextRequest, NextResponse } from "next/server";

interface UntisSchool {
  schoolId: number;
  displayName: string;
  schoolName: string;
  address: string;
  serverUrl: string;
  loginName: string;
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  if (!query || query.length < 2) {
    return NextResponse.json({ schools: [] });
  }

  try {
    const res = await fetch(
      "https://mobile.webuntis.com/ms/schoolquery2",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: "schoolquery",
          jsonrpc: "2.0",
          method: "searchSchool",
          params: [{ search: query }],
        }),
      }
    );

    const data = await res.json();
    const schools: UntisSchool[] = data?.result?.schools ?? [];

    return NextResponse.json({
      schools: schools.slice(0, 8).map((s) => ({
        name: s.displayName,
        loginName: s.loginName,
        server: new URL(s.serverUrl).hostname,
        address: s.address,
      })),
    });
  } catch {
    return NextResponse.json({ schools: [] });
  }
}
