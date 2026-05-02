import React from "react";

interface Props {
  onError: () => void;
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary3D extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn("[3D] runtime error, falling back to 2D:", error);
    this.props.onError();
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}
