const { Plan, PlanCard, User, sequelize } = require("../../models");
const chai = require("chai");
chai.should();
const { expect } = require("chai");
const reqFunc = require("../util/reqFunc");
const jwt = require("jsonwebtoken");

describe("๐ฅGET /plan-cards", () => {
  const url = "/plan-cards";

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
        coordinates: [1, 9],
        address: "์ฑ๋จ์ ๋ถ๋น๊ตฌ ...",
      },
      result: {},
    },
  ];

  before(async () => {
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
        planCard.origin.PlanId = plans[0].result.id;
        planCard.origin.coordinates = {
          type: "Point",
          coordinates: planCard.origin.coordinates,
        };

        planCard.result = await PlanCard.create(planCard.origin, {
          transaction: t,
        });
      }
    });
  });

  describe("๐check field required and data type checking", () => {
    //ํ์๊ฐ ์ฒดํฌ ๋ฐ ํ์ ํ์ธ
    //์๋ planId๋ฅผ ์?์กํ๋ฉด 404์ฝ๋ ๋ฐํ
    it("check planId required", (done) => {
      const path = "";

      reqFunc(url + path, "get", {}, (err, res) => {
        res.should.have.status(404);
        done();
      });
    });

    it("check ignore wrong data type plan id", (done) => {
      const path = `/test`;

      reqFunc(url + path, "get", {}, (err, res) => {
        res.should.have.status(400);
        res.body.should.have.property("message").eql("Insufficient info");
        done();
      });
    });

    it("check ignore none exists resource", (done) => {
      const path = `/${plans[0].result.id + 1}`;

      reqFunc(url + path, "get", {}, (err, res) => {
        res.should.have.status(404);
        res.body.should.have
          .property("message")
          .eql("There is no data with given plan id");
        done();
      });
    });
  });

  describe("๐check successfully get plancards and auth info", () => {
    const checkResponseSameWithPlanCards = (done, res) => {
      for (const [idx, planCard] of planCards.entries()) {
        expect(planCard.result.day).to.eql(res.body.planCards[idx].day);
        expect(planCard.result.startTime).to.eql(
          res.body.planCards[idx].startTime
        );
        expect(planCard.result.endTime).to.eql(res.body.planCards[idx].endTime);
        expect(planCard.result.comment).to.eql(res.body.planCards[idx].comment);
        expect(planCard.result.theme).to.eql(res.body.planCards[idx].theme);
        expect(planCard.result.address).to.eql(res.body.planCards[idx].address);
        expect(planCard.result.coordinates).to.deep.eql(
          res.body.planCards[idx].coordinates
        );
      }
      done();
    };

    //isValid์ isMember๊ฐ ์ ๋์ค๋์ง authorization์?๋ณด๋ฅผ ๋๋ฝ, ๋น๊ถํ์, ์์?์๋ก ์๋?ฅํ์ฌ ๊ฐ ํ์ธ
    //plan-cards๊ฐ ์?ํํ ์ผ์นํ๋์ง ํ์ธ
    it("check non-members response isMember, isValid is false", (done) => {
      const path = `/${plans[0].result.id}`;

      reqFunc(url + path, "get", {}, (err, res) => {
        res.should.have.status(200);
        res.body.should.have.property("isMember").eql(false);
        res.body.should.have.property("isValid").eql(false);
        checkResponseSameWithPlanCards(done, res);
      });
    });

    it("check not owner response isMember is true and isValid is false", (done) => {
      const path = `/${plans[0].result.id}`;
      const query = `/?email=${users[1].result.email}`;
      const req = {
        accessToken: users[1].result.latestToken,
      };

      reqFunc(url + path + query, "get", req, (err, res) => {
        res.should.have.status(200);
        res.body.should.have.property("isMember").eql(true);
        res.body.should.have.property("isValid").eql(false);
        checkResponseSameWithPlanCards(done, res);
      });
    });

    it("check owner response isMember, isValid is true", (done) => {
      const path = `/${plans[0].result.id}`;
      const query = `/?email=${users[0].result.email}`;
      const req = {
        accessToken: users[0].result.latestToken,
      };
      const originPlan = { ...plans[0].origin };
      delete originPlan.UserId;
      delete originPlan.planCards;

      reqFunc(url + path + query, "get", req, (err, res) => {
        res.should.have.status(200);
        res.body.should.have.property("isMember").eql(true);
        res.body.should.have.property("isValid").eql(true);
        res.body.should.have.property("plan");
        res.body.plan.should.have.property("title").eql(originPlan.title);
        res.body.plan.should.have.property("desc").eql(originPlan.desc);
        res.body.plan.should.have
          .property("public")
          .eql(originPlan.title ? 1 : 0);
        res.body.plan.should.have.property("dayCount").eql(originPlan.dayCount);
        res.body.plan.should.have
          .property("representAddr")
          .eql(originPlan.representAddr);
        checkResponseSameWithPlanCards(done, res);
      });
    });
  });
});
