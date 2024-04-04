type CastActionParams = {
  /** The action name. Must be less than 30 characters. */
  name: string;
  /** An [Octicons](https://primer.style/foundations/icons) icon name. */
  icon: string;
  /** The action type. (Same type options as frame buttons). Only post is accepted in V1. */
  actionType: "post";
  postUrl: string;
};
export function constructCastActionUrl(params: CastActionParams): string {
  // Validate the input parameters
  if (params.name.length > 30) {
    throw new Error("The action name must be less than 30 characters.");
  }

  if (params.actionType.toLowerCase() !== "post") {
    throw new Error('The action type must be "post" in V1.');
  }

  // Construct the URL
  const baseUrl = "https://warpcast.com/~/add-cast-action";
  const urlParams = new URLSearchParams({
    name: params.name,
    icon: params.icon,
    actionType: params.actionType,
    postUrl: params.postUrl,
  });

  return `${baseUrl}?${urlParams.toString()}`;
}
