import SellFlow from "./SellFlow";

export const metadata = {
  title: "Sell an item | Reloved",
};

// Path 1. No account yet: she is asked for one at submit.
//
// SellFlow renders its own <main>, because the nav has to sit outside it. With
// the nav inside, the page's own top padding pushed it 32px down the screen
// and the container's side padding indented it, so tapping Sell made the nav
// visibly jump out of place. It is the same bar in the same spot as every
// other page, and it has to stay there.
export default function SellPage() {
  return <SellFlow />;
}
