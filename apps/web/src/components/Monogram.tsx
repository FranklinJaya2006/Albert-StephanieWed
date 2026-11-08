import logo from "../assets/monogram-as.png";

// The couple's monogram: a gold "A S" with a flourish, cut out of its background so it sits on
// the cream paper. Replace src/assets/monogram-as.png to change it (keep a transparent background).
function Monogram({ first, second, className = "" }: { first: string; second: string; className?: string }) {
  return <img className={`monogram ${className}`} src={logo} width={370} height={480} alt={`${first} & ${second}`} draggable={false} />;
}

export default Monogram;
