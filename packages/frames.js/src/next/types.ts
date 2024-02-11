/** See https://nextjs.org/docs/app/api-reference/file-conventions/page#searchparams-optional */
export type NextServerPageProps = {
  params: { slug: string };
  searchParams?: { [key: string]: string | string[] | undefined };
};
