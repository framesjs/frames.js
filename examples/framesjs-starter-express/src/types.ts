type FrameButton = {
    label: string;
    action: string;
    target?: string;
};

export type FrameContents = {
    imageUrl: string;
    imageAspectRatio: string;
    postUrl: string;
    inputText?: string;
    buttons?: FrameButton[];
};