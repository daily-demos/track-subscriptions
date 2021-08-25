import { defaultTheme } from "evergreen-ui";

const theme = {
  ...defaultTheme,
  fontFamilies: {
    ...defaultTheme.fontFamilies,
    display: "'Rubik', sans-serif",
    ui: "'Rubik', sans-serif",
  },
  components: {
    ...defaultTheme.components,
    Button: {
      ...defaultTheme.components.Button,
      appearances: {
        ...defaultTheme.components.Button.appearances,
        daily: {
          color: "#121A24",
          backgroundColor: "#1bebb9",
          fontWeight: "bold",
          _hover: {
            boxShadow: "0 0 0 2px rgb(27 235 185 / 60%)",
          },
          _focus: {
            boxShadow: "0 0 0 2px rgb(27 235 185 / 60%)",
          },
        },
      },
    },
  },
};

export default theme;
