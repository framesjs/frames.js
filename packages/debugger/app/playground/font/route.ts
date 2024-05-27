export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);

  const family = url.searchParams.get("family");
  const weight = url.searchParams.get("weight");
  const text = url.searchParams.get("text");

  if (!family) {
    return new Response("Missing family parameter", {
      status: 400,
    });
  }

  const fontCssUrl = new URL("https://fonts.googleapis.com/css2");

  fontCssUrl.searchParams.set(
    "family",
    `${encodeURIComponent(family)}${weight ? `:wght@${weight}` : ""}`
  );

  if (text) {
    fontCssUrl.searchParams.set("text", text);
  } else {
    fontCssUrl.searchParams.set("subset", "latin-ext");
  }

  const fontCssResponse = await fetch(fontCssUrl, {
    headers: {
      // construct user agent to get TTF font
      "User-Agent":
        "Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1",
    },
  });

  const body = await fontCssResponse.text();
  // Get the font URL from the CSS text
  const fontUrl = body.match(
    /src: url\((.+)\) format\('(opentype|truetype)'\)/
  )?.[1];

  if (!fontUrl) {
    throw new Error("Could not find font URL");
  }

  return fetch(fontUrl).then(
    (res) =>
      new Response(res.body, {
        headers: {
          "Content-Type": "font/ttf",
          "Cache-Control": "public, max-age=60",
        },
      })
  );
}
