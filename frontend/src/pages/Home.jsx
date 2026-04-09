import Banner from "../components/Banner";
import Hero from "../components/Hero";
import SpecialityMenu from "../components/SpecialityMenu";
import TopDoctors from "../components/TopDoctors";
import InstallPrompt from "../components/InstallPrompt";

const Home = () => {
  return (
    <>
      <InstallPrompt />
      <Hero />
      <SpecialityMenu />
      <TopDoctors />
      <Banner />
    </>
  );
};

export default Home;
