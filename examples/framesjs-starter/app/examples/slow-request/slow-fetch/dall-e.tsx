async function fetchBlob(url: string) {
  const response = await fetch(url);
  return response.blob();
}

const uploadToImgur = async (file: Blob): Promise<string | null> => {
  const formData = new FormData();
  formData.append("image", file);
  formData.append("type", "file");
  const response = await fetch("https://api.imgur.com/3/upload", {
    method: "POST",
    headers: {
      Authorization: `Client-ID ${process.env.EXAMPLE_SLOW_REQUEST_IMGUR_CLIENTID}`, // replace with your Client ID
    },
    body: formData,
  });

  const { data, error } = await response.json();

  if (!response.ok) {
    console.error(response.status, response.statusText, error, data);
    return null;
  }

  if (!data) return null;

  return data.link;
};

export type DalleSuccessResult = {
  data: {
    created: number;
    data: Array<{ url: string; revised_prompt: string }>;
  };
};

export type DalleErrorResult = {
  error: null | any;
};

type DalleResult = DalleErrorResult | DalleSuccessResult;

export async function Dalle(prompt: string, fid: number): Promise<DalleResult> {
  const imageResponse = await fetch(
    `https://api.openai.com/v1/images/generations`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.EXAMPLE_SLOW_REQUEST_CHATGPT_API_SECRET}`,
        ...(process.env.EXAMPLE_SLOW_REQUEST_CHATGPT_ORGANIZATION_ID && {
          "OpenAI-Organization": `${process.env.EXAMPLE_SLOW_REQUEST_CHATGPT_ORGANIZATION_ID}`,
        }),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: prompt,
        response_format: "url",
        // We're not going to be able to credibly store anonymized user ids
        // OpenAI can see these are never used twice, and are hence likely randomized like this, but whether they will act on that is tbd
        user: `user_${fid}`,
      }),
    }
  );

  if (!imageResponse.ok) {
    console.error(imageResponse.status, imageResponse.statusText);
    return {
      error: "Something went wrong, try again later",
    };
  }

  const responseBody: {
    created: number;
    data: Array<{ url: string; revised_prompt: string }>;
  } = await imageResponse.json();

  try {
    return {
      data: {
        created: responseBody.created,
        data: await Promise.all(
          responseBody.data.map(async (el) => {
            const imageURL = await uploadToImgur(await fetchBlob(el.url));

            if (!imageURL) throw new Error("couldnt upload to imgur");

            return {
              url: imageURL,
              revised_prompt: el.revised_prompt,
            };
          })
        ),
      },
    };
  } catch (error) {
    return {
      error: error,
    };
  }
}
