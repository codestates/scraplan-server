const { Plan, PlanCard, User, sequelize } = require("../../models");
const chai = require("chai");
chai.should();
const { expect } = require("chai");
const reqFunc = require("../util/reqFunc");
const jwt = require("jsonwebtoken");

describe("๐ฅPATCH /plan", () => {
  const url = "/plan";

  const users = [
    {
      origin: {
        email: "t1@test.com",
        nickname: "user1",
        password: 1234,
      },
      result: {},
    },
    {
      origin: {
        email: "t2@test.com",
        nickname: "user2",
        password: 1234,
      },
      result: {},
    },
  ];
  const newPlan = {
    title: "๋ณ๊ฒฝ๋ ์ ๋ชฉ",
    desc: "๋ณ๊ฒฝ๋ ์ค๋ช",
    public: false,
    planId: "",
    representAddr: "๋ณ๊ฒฝ๋ ๋์",
  };
  const newPlanCard = [
    {
      day: 4,
      startTime: "14:00",
      endTime: "16:45",
      comment: "๋ณ๊ฒฝ๋ ์ค๋ช",
      theme: 5,
      coordinates: [15, 20],
      address: "๋ณ๊ฒฝ์ ๋ณ๊ฒฝ๋",
    },
  ];
  const plans = [
    {
      origin: {
        title: "๊ณต๊ฐ๊ธ1",
        desc: "๊ณต๊ฐ๊ธ1",
        public: true,
        UserId: "",
        dayCount: 2,
        representAddr: "์์ธ์",
        planCards: [],
      },
      result: {},
    },
  ];
  before(async () => {
    const planCards = [
      {
        origin: {
          day: 1,
          startTime: "10:00",
          endTime: "10:45",
          comment: "๋ถ์๊ธฐ ์๋ ์นดํ",
          theme: 2,
          coordinates: [5, 10],
          address: "์ฑ๋จ์ ๋ถ๋น๊ตฌ ...",
        },
        result: {},
      },
      {
        origin: {
          day: 2,
          startTime: "10:00",
          endTime: "10:45",
          comment: "๋ถ์๊ธฐ ์๋ ์นดํ",
          theme: 2,
          coordinates: [7, 10],
          address: "์ฑ๋จ์ ๋ถ๋น๊ตฌ ...",
        },
        result: {},
      },
      {
        origin: {
          day: 2,
          startTime: "12:00",
          endTime: "13:45",
          comment: "๋ถ์๊ธฐ ์๋ ์นดํ",
          theme: 2,
          coordinates: [7, 9],
          address: "์ฑ๋จ์ ๋ถ๋น๊ตฌ ...",
        },
        result: {},
      },
    ];

    await sequelize.transaction(async (t) => {
      await User.destroy({ where: {}, transaction: t });
      await Plan.destroy({ where: {}, transaction: t });
      await PlanCard.destroy({ where: {}, transaction: t });

      for (const user of users) {
        user.result = await User.create(user.origin, { transaction: t });

        const accessToken = jwt.sign(
          { id: user.result.id, nickname: user.result.nickname },
          process.env.ACCESS_SECRET,
          { expiresIn: "1H" }
        );

        user.result.latestToken = accessToken;
        await user.result.save({ transaction: t });
      }

      plans[0].origin.UserId = users[0].result.id;

      for (const plan of plans) {
        plan.result = await Plan.create(plan.origin, { transaction: t });
      }

      for (const planCard of planCards) {
        plans[0].origin.planCards.push({
          ...planCard.origin,
          coordinates: planCard.origin.coordinates,
        });

        planCard.origin.PlanId = plans[0].result.id;
        planCard.origin.coordinates = {
          type: "Point",
          coordinates: planCard.origin.coordinates,
        };

        planCard.result = await PlanCard.create(planCard.origin, {
          transaction: t,
        });
      }

      plans[0].origin.planCards = encodeURIComponent(
        JSON.stringify(plans[0].origin.planCards)
      );

      newPlan.planId = plans[0].result.id;
      newPlan.planCards = encodeURIComponent(JSON.stringify(newPlanCard));
    });
  });

  describe("๐check required field", () => {
    const checkRequiredField = (checkFields, done) => {
      const req = {
        ...newPlan,
        accessToken: users[0].result.latestToken,
        email: users[0].result.email,
      };
      for (const field of checkFields) {
        delete req[field];
      }

      reqFunc(url, "patch", req, (err, res) => {
        res.should.have.status(400);
        res.body.should.have.property("message").eql("Insufficient info");
        done();
      });
    };
    it("check accessToken required", (done) => {
      checkRequiredField(["accessToken"], done);
    });
    it("check email required", (done) => {
      checkRequiredField(["email"], done);
    });
    it("check planId required", (done) => {
      checkRequiredField(["planId"], done);
    });
    it("check at least one optional required", (done) => {
      checkRequiredField(
        ["title", "desc", "public", "representAddr", "planCards"],
        done
      );
    });
  });

  describe("๐check ignore case", () => {
    function checkIgnoreOrignData(checkFields, done) {
      const req = {
        planId: newPlan.planId,
        accessToken: users[0].result.latestToken,
        email: users[0].result.email,
      };
      for (const field of checkFields) {
        req[field] = plans[0].origin[field];
      }

      reqFunc(url, "patch", req, (err, res) => {
        res.should.have.status(400);
        res.body.should.have.property("message").eql("Nothing Changed");
        done();
      });
    }
    it("check ignore wrong data type public", (done) => {
      const req = {
        ...newPlan,
        accessToken: users[0].result.latestToken,
        email: users[0].result.email,
      };
      req.public = "test";

      reqFunc(url, "patch", req, (err, res) => {
        res.should.have.status(400);
        res.body.should.have.property("message").eql("Insufficient info");
        done();
      });
    });
    it("check ignore not owners", (done) => {
      const req = {
        ...newPlan,
        accessToken: users[1].result.latestToken,
        email: users[1].result.email,
      };

      reqFunc(url, "patch", req, (err, res) => {
        res.should.have.status(403);
        done();
      });
    });

    it("check ignore nothing changed with original title request", (done) => {
      checkIgnoreOrignData(["title"], done);
    });
    it("check ignore nothing changed with original desc request", (done) => {
      checkIgnoreOrignData(["desc"], done);
    });
    it("check ignore nothing changed with original public request", (done) => {
      checkIgnoreOrignData(["public"], done);
    });
    it("check ignore nothing changed with original representAddr request", (done) => {
      checkIgnoreOrignData(["representAddr"], done);
    });
    it("check ignore nothing changed with original planCards request", (done) => {
      checkIgnoreOrignData(["planCards"], done);
    });
  });

  describe("๐check ignore changed with wrong data type of planCards", () => {
    function checkIgnoreWrongPlanCards(checkFields, valueChangeFiled, done) {
      const planCard = [{ ...newPlanCard[0] }];
      const req = {
        planId: newPlan.planId,
        accessToken: users[0].result.latestToken,
        email: users[0].result.email,
      };
      for (const field of checkFields) {
        delete planCard[0][field];
      }
      for (const field in valueChangeFiled) {
        planCard[0][field] = valueChangeFiled[field];
      }
      req.planCards = encodeURIComponent(JSON.stringify(planCard));

      reqFunc(url, "patch", req, (err, res) => {
        res.should.have.status(400);
        res.body.should.have.property("message").eql("Insufficient info");
        done();
      });
    }
    it("check ignore without startTime in planCards", (done) => {
      checkIgnoreWrongPlanCards(["startTime"], {}, done);
    });
    it("check ignore without endTime in planCards", (done) => {
      checkIgnoreWrongPlanCards(["endTime"], {}, done);
    });
    it("check ignore without comment in planCards", (done) => {
      checkIgnoreWrongPlanCards(["comment"], {}, done);
    });
    it("check ignore without coordinates in planCards", (done) => {
      checkIgnoreWrongPlanCards(["coordinates"], {}, done);
    });
    it("check ignore without address in planCards", (done) => {
      checkIgnoreWrongPlanCards(["address"], {}, done);
    });
    it("check ignore without day in planCards", (done) => {
      checkIgnoreWrongPlanCards(["day"], {}, done);
    });
    it("check ignore without theme in planCards", (done) => {
      checkIgnoreWrongPlanCards(["theme"], {}, done);
    });
    it("check ignore wrong planCards-day", (done) => {
      checkIgnoreWrongPlanCards([], { day: "TEST" }, done);
    });
    it("check ignore wrong planCards-theme", (done) => {
      checkIgnoreWrongPlanCards([], { theme: "TEST" }, done);
    });
    it("check ignore wrong planCards-theme", (done) => {
      checkIgnoreWrongPlanCards([], { testAdditional: "TEST" }, done);
    });
  });

  describe("๐check value changed with new data", () => {
    const checkChangedValue = async (checkFields, done) => {
      try {
        const req = {
          planId: newPlan.planId,
          // accessToken: users[0].result.latestToken,
          email: users[0].result.email,
        };
        for (const field of checkFields) {
          req[field] = newPlan[field];
        }

        const originPlan = await Plan.findOne({
          where: { id: newPlan.planId },
          raw: true,
        });

        await chai
          .request(require("../../index"))
          .patch(url)
          .set({ authorization: `Bearer ${users[0].result.latestToken}` })
          .send(req)
          .then((res) => {
            res.should.have.status(200);
            res.body.should.have.property("message").eql("successfully edited");
          });

        const resultPlan = await Plan.findOne({
          where: { id: newPlan.planId },
          raw: true,
        });

        for (let field of checkFields) {
          if (field === "planCards") {
            field = "dayCount";
          }
          expect(originPlan[field]).to.not.deep.eql(resultPlan[field]);

          if (field === "public") {
            expect(resultPlan[field] === 0 ? false : true).to.deep.eql(
              newPlan[field]
            );
          } else if (field === "dayCount") {
            const planCards = await PlanCard.findAll({
              attributes: [
                "day",
                "startTime",
                "endTime",
                "comment",
                "theme",
                "coordinates",
                "address",
              ],
              where: { PlanId: newPlan.planId },
              raw: true,
            });

            expect(planCards.length).to.eql(newPlanCard.length);

            for (const [index, planCard] of planCards.entries()) {
              const { coordinates, ...planCardEl } = planCard;
              const {
                coordinates: reqCoordinates,
                ...reqPlanCardEl
              } = newPlanCard[index];

              expect(coordinates.coordinates).to.deep.equal(reqCoordinates);
              expect(planCardEl).to.deep.equal(reqPlanCardEl);
            }

            expect(resultPlan[field]).to.deep.eql(
              newPlanCard[newPlanCard.length - 1].day
            );
          } else {
            expect(resultPlan[field]).to.deep.eql(newPlan[field]);
          }
        }
        done();
      } catch (err) {
        done(err);
      }
    };
    it("check plan title is changed", (done) => {
      checkChangedValue(["title"], done);
    });
    it("check plan desc is changed", (done) => {
      checkChangedValue(["desc"], done);
    });
    it("check plan public is changed", (done) => {
      checkChangedValue(["public"], done);
    });
    it("check plan representAddr is changed", (done) => {
      checkChangedValue(["representAddr"], done);
    });
    it("check plan dayCount is changed by planCards", (done) => {
      checkChangedValue(["planCards"], done);
    });
    it("check pass editional plancard", (done) => {
      newPlanCard.push(
        {
          day: 7,
          startTime: "14:00",
          endTime: "16:45",
          comment: "์ถ๊ฐ ํ์คํธ ํ์ผ",
          theme: 5,
          coordinates: [21, 30],
          address: "์ถ๊ฐ์ ์ถ๊ฐ๋",
        },
        {
          day: 10,
          startTime: "14:00",
          endTime: "16:45",
          comment: "์ถ๊ฐ ํ์คํธ ํ์ผ",
          theme: 5,
          coordinates: [21, 30],
          address: "์ถ๊ฐ์ ์ถ๊ฐ๋",
        }
      );
      newPlan.planCards = encodeURIComponent(JSON.stringify(newPlanCard));
      checkChangedValue(["planCards"], done);
    });

    it("check pass just delete one plancard", (done) => {
      newPlanCard.pop();
      newPlan.planCards = encodeURIComponent(JSON.stringify(newPlanCard));
      checkChangedValue(["planCards"], done);
    });
  });
});
