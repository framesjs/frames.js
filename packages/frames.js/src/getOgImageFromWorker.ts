import React from "react";
import type {
    ImageAspectRatio
} from "frames.js";
import type { SatoriOptions } from "satori";

async function fetchRemoteImage(url: string): Promise<ArrayBuffer | null> {
    try {
        // Fetch the remote image
        const response = await fetch(url);

        // Check if the request was successful
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
        }

        // Read the response body as ArrayBuffer
        const buffer = await response.arrayBuffer();
        console.log('Remote image fetched successfully');

        return buffer;
    } catch (error) {
        console.error('Error fetching remote image:', error);
        return null;
    }
}

export async function getOgImageFromWorker(content: string, ratio: string, format: string) {
    const workerOgUrl = process.env.NODE_ENV === "development" ? "http://localhost:8082/" : "https://imageog.open4glabs.xyz/";
    let imgSrc: any;
    
    imgSrc = await fetchRemoteImage(`${workerOgUrl}?content=${content}&ratio=${ratio}&format=${format}`).then((arrayBuffer) => {
        if (arrayBuffer) {
            // Use the ArrayBuffer here
            //console.log('Image fetched as ArrayBuffer:', arrayBuffer);
            return `data:image/png;base64,${Buffer.from(arrayBuffer).toString("base64")}`;
        } else {
            console.error('Fetching image failed.');
            return "false";
        }
    });

    return imgSrc;
}