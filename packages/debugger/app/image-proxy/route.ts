/**
 * Allows to load images using fetch in client side to avoid CORS issues.
 */
export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);

  try {
    const imgUrl = url.searchParams.get("url");

    if (!imgUrl) {
      throw new Error("Missing image url");
    }

    return fetch(new URL(imgUrl));
  } catch (e) {
    return Response.json(String(e), { status: 400 });
  }
}
