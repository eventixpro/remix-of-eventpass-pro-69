import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center p-4 bg-background">
                    <Card className="w-full max-w-md border-destructive/50 bg-destructive/5">
                        <CardHeader className="text-center">
                            <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit mb-4">
                                <AlertCircle className="w-8 h-8 text-destructive" />
                            </div>
                            <CardTitle className="text-2xl">Something went wrong</CardTitle>
                        </CardHeader>
                        <CardContent className="text-center space-y-2">
                            <p className="text-muted-foreground">
                                An unexpected error occurred. We've logged this issue.
                            </p>
                            {this.state.error && (
                                <div className="bg-background/50 p-2 rounded text-xs font-mono text-left overflow-auto max-h-32 border">
                                    {this.state.error.toString()}
                                </div>
                            )}
                            {this.state.error?.message?.includes('Backend config missing') && (
                                <p className="text-xs text-muted-foreground mt-2">
                                    Try clicking "Reload Application" - environment variables may still be syncing after a recent change.
                                </p>
                            )}
                        </CardContent>
                        <CardFooter className="justify-center">
                            <Button
                                onClick={() => window.location.reload()}
                                variant="default"
                                className="gap-2"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Reload Application
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            );
        }

        return this.props.children;
    }
}
