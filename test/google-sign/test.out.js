const { User } = require("../../models");

const nock = require("nock");
const chai = require("chai");
const reqFunc = require("../util/reqFunc");

chai.should();

const url = "/google-sign/out";

describe("🔥PATCH /google-sign/out", () => {
  let accessToken,
    email,
    nickname = "yubin-j";
  before(async () => {
    await User.destroy({
      where: {},
    });

    if (!nock.isActive()) {
      nock.activate();
    }

    nock("https://people.googleapis.com")
      .persist()
      .get("/v1/people/me?personFields=emailAddresses")
      .reply(200, {
        resourceName: "testGoogleId",
        emailAddresses: [
          {
            value: "testGoogle@test.com",
          },
        ],
      });
  });

  after(() => {
    nock.cleanAll();
    nock.restore();
  });

  it("sign up and in", (done) => {
    const req = {
      hashData: "#access_token=temp-access-token",
      nickname,
    };
    reqFunc("/google-sign/up", "post", req, (err, res) => {
      res.should.have.status(200);
      res.body.should.have.property("message").eql("Successfully signedup");

      delete req.nickname;
      reqFunc("/google-sign/in", "patch", req, (err, res) => {
        res.should.have.status(200);
        res.body.should.have.property("accessToken");
        res.body.should.have.property("email");

        accessToken = res.body.accessToken;
        email = res.body.email;

        done();
      });
    });
  });

  it("check email required", (done) => {
    const req = {
      accessToken,
    };
    reqFunc(url, "patch", req, (err, res) => {
      res.should.have.status(400);
      res.body.should.property("message").eql("Insufficient info");
      done();
    });
  });

  it("check accessToken required", (done) => {
    const req = {
      email,
    };
    reqFunc(url, "patch", req, (err, res) => {
      res.should.have.status(400);
      res.body.should.property("message").eql("Insufficient info");
      done();
    });
  });

  it("check ignore empty accessToken", (done) => {
    const req = {
      accessToken: "",
      email,
    };
    reqFunc(url, "patch", req, (err, res) => {
      res.should.have.status(400);
      res.body.should.property("message").eql("Insufficient info");
      done();
    });
  });

  it("check sign out", (done) => {
    const req = {
      accessToken,
      email,
    };
    reqFunc(url, "patch", req, (err, res) => {
      res.should.have.status(200);
      res.body.should.property("message").eql("Successfully logouted");

      User.findOne({
        where: { email },
        raw: true,
      })
        .then((userInfo) => {
          userInfo.should.property("latestToken").is.null;
          done();
        })
        .catch((err) => {
          done(err);
        });
    });
  });
});
