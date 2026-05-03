//
//  ai_menuUITestsLaunchTests.swift
//  ai menuUITests
//
//  Created by 美美 on 2026/4/17.
//

import XCTest

final class ai_menuUITestsLaunchTests: XCTestCase {

    override class var runsForEachTargetApplicationUIConfiguration: Bool {
        false
    }

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    @MainActor
    func testLaunch() throws {
        let app = XCUIApplication()
        app.launchArguments += ["-AppleLanguages", "(en)", "-AppleLocale", "en_US"]
        app.launch()

        XCTAssertTrue(app.staticTexts["AI MENU"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["Camera"].exists)
        XCTAssertTrue(app.buttons["Photos"].exists)

        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = "Launch Screen"
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
