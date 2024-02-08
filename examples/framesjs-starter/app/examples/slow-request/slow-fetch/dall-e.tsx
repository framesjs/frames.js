const { EXAMPLE_SLOW_REQUEST_IMGUR_CLIENTID } = process.env;

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
      Authorization: `Client-ID ${EXAMPLE_SLOW_REQUEST_IMGUR_CLIENTID}`, // replace with your Client ID
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

export async function Dalle(
  prompt: string,
  fid: number
): Promise<{
  data?: {
    created: number;
    data: Array<{ url: string; revised_prompt: string }>;
  };
  error: null | any;
}> {
  const imageResponse = await fetch(
    `https://api.openai.com/v1/images/generations`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CHATGPT_API_SECRET}`,
        "OpenAI-Organization": `${process.env.CHATGPT_ORGANIZATION_ID}`,
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

  let urls;
  try {
    urls = await Promise.all(
      responseBody.data.map(async (el) => {
        const b = await fetchBlob(el.url);
        const imgur = await uploadToImgur(b);
        if (!imgur) throw new Error("couldnt upload to imgur");
        return imgur;
      })
    );
  } catch (error) {
    return {
      error: error,
    };
  }

  return {
    ...responseBody,
    data: responseBody.data.map((el, i) => ({
      url: urls[i],
      revised_prompt: el.revised_prompt,
    })),
  };
}
