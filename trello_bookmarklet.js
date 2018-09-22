(() => {
  let $;

  /* This is run after we've connected to Trello and selected a list */
  const run = async (Trello, idList) => {
    const { _value: idBoard } = await new Promise((resolve, reject) =>
      Trello.get(`lists/${idList}/idBoard`, resolve, reject)
    );
    const customFields = await new Promise((resolve, reject) =>
      Trello.get(`boards/${idBoard}/customFields`, resolve, reject)
    );
    const fieldIdFromPattern = nameRegex => {
      const matchingFields = customFields.filter(field =>
        nameRegex.test(field.name)
      );
      if (matchingFields.length !== 1) {
        throw new Error(
          "Pattern",
          nameRegex,
          "matched the following fields:",
          matchingFields.map(field => field.name)
        );
      }
      return matchingFields[0].id;
    };

    const flatSearchCentre = window.flatSearchCentre;

    let name;
    // Default description is the URL of the page we're looking at
    let desc = location.href;

    // use page title as card title, taking trello as a "read-later" tool
    name = $.trim(document.title);
    let images = [],
      attachments = [],
      customFieldItems = [];

    if (typeof ZPG !== "undefined") {
      const addressOrPostcode =
        ZPG.trackData.taxonomy.outcode + " " + ZPG.trackData.taxonomy.incode;

      desc +=
        "\n\n" +
        document.querySelector(".dp-features").innerText +
        "\n\n" +
        document.querySelector(".dp-description").innerText;

      images.push(
        ...new Set(
          Array.from(document.querySelectorAll(".dp-gallery__image")).map(
            img => img.src
          )
        ).values()
      );

      attachments.push(
        ...images.map(imageUrl => ({ url: imageUrl })),
        {
          name: "Zoopla",
          url: document.querySelector("link[rel=canonical]").href
        }
      );

      if (flatSearchCentre) {
        attachments.push({
          name: "Cycling directions",
          url: `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
            addressOrPostcode
          )}&destination=${encodeURIComponent(flatSearchCentre)}&travelmode=bicycling`
        });
      }

      customFieldItems.push({
        pattern: /\brent\b/i,
        value: { number: ZPG.trackData.taxonomy.price }
      });
    }

    // Get any selected text
    let selection;

    if (window.getSelection) {
      selection = `${window.getSelection()}`;
    } else if (document.selection && document.selection.createRange) {
      selection = document.selection.createRange().text;
    }

    // If they've selected text, add it to the name/desc of the card
    if (selection) {
      if (!name) {
        name = selection;
      } else {
        desc += `\n\n${selection}`;
      }
    }

    name = name || "Unknown page";

    // Create the card
    if (name) {
      const card = await new Promise((resolve, reject) =>
        Trello.post(
          `lists/${idList}/cards`,
          {
            name,
            desc
          },
          resolve,
          reject
        )
      );

      await Promise.all(
        customFieldItems.map(
          ({ pattern, ...item }) =>
            new Promise((resolve, reject) =>
              Trello.put(
                `/card/${card.id}/customField/${fieldIdFromPattern(
                  pattern
                )}/item`,
                item,
                resolve,
                reject
              )
            )
        )
      );

      await Promise.all(
        attachments.map(
          attachment =>
            new Promise((resolve, reject) =>
              Trello.post(
                `cards/${card.id}/attachments`,
                attachment,
                resolve,
                reject
              )
            )
        )
      );

      // Display a little notification in the upper-left corner with a link to the card
      // that was just created
      const $cardLink = $("<a>")
        .attr({
          href: card.url,
          target: "card"
        })
        .text("Created a Trello Card")
        .css({
          position: "absolute",
          left: 0,
          top: 0,
          padding: "4px",
          border: "1px solid #000",
          background: "#fff",
          "z-index": 1e3
        })
        .appendTo("body");

      setTimeout(() => {
        $cardLink.fadeOut(3000);
      }, 5000);
    }
  };

  const storage = window.localStorage;
  if (!storage) {
    return;
  }

  // Store/retrieve a value from local storage
  const store = function(key, value) {
    if (arguments.length == 2) {
      return (storage[key] = value);
    } else {
      return storage[key];
    }
  };

  // A fake "prompt" to get info from the user
  const overlayPrompt = (html, hasInput, callback) => {
    const done = value => {
      $div.remove();
      $overlay.remove();
      callback(value);
    };

    // Cover the existing webpage with an overlay
    var $overlay = $("<div>")
      .css({
        background: "#000",
        opacity: 0.75,
        "z-index": 1e4,
        position: "absolute",
        left: 0,
        top: 0,
        right: 0,
        bottom: 0
      })
      .appendTo("body")
      .click(() => {
        done(null);
      });

    // Show a "popup"
    var $div = $("<div>")
      .css({
        position: "absolute",
        border: "1px solid #000",
        padding: "16px",
        width: 300,
        top: 64,
        left: ($(window).width() - 200) / 2,
        background: "#fff",
        "z-index": 1e5
      })
      .appendTo("body");

    // Show the prompt
    $("<div>")
      .html(html)
      .appendTo($div);

    // Optionally show an input
    const $input = $("<input>")
      .css({
        width: "100%",
        "margin-top": "8px"
      })
      .appendTo($div)
      .toggle(hasInput);

    // Add an "OK" button
    $("<div>")
      .text("OK")
      .css({
        width: "100%",
        "text-align": "center",
        border: "1px solid #000",
        background: "#eee",
        "margin-top": "8px",
        cursor: "pointer"
      })
      .appendTo($div)
      .click(() => {
        done($input.val());
      });

    return $div;
  };

  // Run several asyncronous functions in order
  const waterfall = fxs => {
    const runNext = function() {
      if (fxs.length) {
        fxs
          .shift()
          .apply(null, Array.prototype.slice.call(arguments).concat([runNext]));
      }
    };
    runNext();
  };

  // The ids of values we keep in localStorage
  const appKeyName = "trelloAppKey";
  const idListName = "trelloIdList";
  async function main() {
    if (!window.jQuery) {
      await new Promise(resolve => {
        const script = document.createElement("script");
        script.src =
          "https://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min.js";
        script.onload = resolve;
        document.getElementsByTagName("head")[0].appendChild(script);
      });
    }

    $ = window.jQuery;

    let appKey = store(appKeyName) || window[appKeyName];
    if (!(appKey && appKey.length == 32)) {
      appKey = await new Promise(resolve =>
        overlayPrompt(
          "Please specify your Trello API Key (you'll only need to do this once per site)<br><br>You can get your API Key <a href='https://trello.com/1/appKey/generate' target='apikey'>here</a><br><br>",
          true,
          newAppKey => {
            if (newAppKey) {
              resolve(newAppKey);
            }
          }
        )
      );
    }

    await new Promise(resolve =>
      $.getScript(`https://trello.com/1/client.js?key=${appKey}`, resolve)
    );

    store(appKeyName, Trello.key());
    await new Promise(resolve =>
      Trello.authorize({
        interactive: false,
        success: resolve,
        error() {
          overlayPrompt("You need to authorize Trello", false, () => {
            Trello.authorize({
              type: "popup",
              expiration: "never",
              scope: { read: true, write: true },
              success: resolve
            });
          });
        }
      })
    );

    let idList = store(idListName) || window[idListName];
    if (!(idList && idList.length == 24)) {
      await new Promise(resolve => {
        Trello.get("members/me/boards", { fields: "name" }, boards => {
          $prompt = overlayPrompt(
            'Which list should cards be sent to?<hr><div class="boards" style="height:500px;overflow-y:scroll"></div>',
            false,
            () => {
              idList = $prompt.find("input:checked").attr("id");
              resolve();
            }
          );

          $.each(boards, (ix, board) => {
            $board = $("<div>").appendTo($prompt.find(".boards"));

            Trello.get(`boards/${board.id}/lists`, lists => {
              $.each(lists, (ix, list) => {
                const $div = $("<div>").appendTo($board);
                idList = list.id;
                $("<input type='radio'>")
                  .attr("id", idList)
                  .attr("name", "idList")
                  .appendTo($div);
                $("<label>")
                  .text(`${board.name} : ${list.name}`)
                  .attr("for", idList)
                  .appendTo($div);
              });
            });
          });
        });
      });
    }

    if (idList) {
      store(idListName, idList);
      await run(Trello, idList);
    }
  }
  return main();
})();
