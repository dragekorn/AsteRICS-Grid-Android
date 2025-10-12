package com.asterics.grid

import android.app.Application

class AstericsGridApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        if (BuildConfig.DEBUG) {
            android.util.Log.d("AstericsGrid", "App initialized")
        }
    }
}
