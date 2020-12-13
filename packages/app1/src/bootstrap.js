import shared2 from "app2/shared";
import shared3 from "app3/shared";
console.log("hi");
(async () => {
  console.log(await shared2());
  console.log(await shared3());
})();
