function withLanguageLayout(baseKeyCodeTable, language = "eng") {
  if (language === "eng") {
    return baseKeyCodeTable;
  } else {
    return baseKeyCodeTable.map(groupe => {
      const newArray = groupe.keys.reduce((acc, key) => {
        const newKey = language.find(item => item.code === key.code);
        if (newKey) {
          console.log(newKey);
          acc.push(newKey);
        } else {
          acc.push(key);
        }
        return acc;
      }, []);

      return {
        ...groupe,
        keys: newArray
      };
    });
  }
}

export default withLanguageLayout;
