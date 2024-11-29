export async function GET() {
  const appUrl = process.env.APP_URL;

  const config = {
    // @todo replace with our own association
    accountAssociation: {
      header: "",
      payload: "",
      signature: "",
    },
    frame: {
      version: "0.0.0",
      name: "Frames v2 Demo",
      iconUrl: `${appUrl}/icon.png`,
      splashImageUrl: `${appUrl}/splash.png`,
      splashBackgroundColor: "#f7f7f7",
      homeUrl: appUrl,
    },
  };

  return Response.json(config);
}
