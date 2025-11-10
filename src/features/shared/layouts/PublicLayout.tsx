interface PublicLayoutProps {
  children: React.ReactNode;
}

export const PublicLayout = ({ children }: PublicLayoutProps) => {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-background via-secondary/30 to-background">
      {children}
    </div>
  );
};
