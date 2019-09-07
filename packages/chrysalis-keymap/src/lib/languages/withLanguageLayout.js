function withLanguageLayout(baseKeyCodeTable, language = "english") {
  if (language === "english") {
    return baseKeyCodeTable;
  } else {
    return baseKeyCodeTable.map(groupe => {
      const newArray = groupe.keys.reduce((acc, key) => {
        const newKey = language.find(item => item.code === key.code);
        if (newKey) {
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
