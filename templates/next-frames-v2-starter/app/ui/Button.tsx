import { Button as UIButton, ButtonProps as UIButtonProps } from '@/components/ui/button';

type ButtonProps = UIButtonProps & {
  isLoading?: boolean;
}

export function Button({
  children,
  isLoading = false,
  ...props
}: ButtonProps) {
  return (
    <UIButton
      {...props}
    >
      {isLoading ? (
        <div className="flex items-center justify-center">
          <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
        </div>
      ) : (
        children
      )}
    </UIButton>
  );
}
